import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { calculateWholesaleCart } from "@/lib/wholesalePricing";
import { validateAddress } from "@/lib/validation";
import { checkPincode } from "@/lib/delivery";
import { decrementStock, restoreStock } from "@/lib/products";
import { createOrder, type OrderItem } from "@/lib/orders";
import { getCreditTerms, drawCredit, adjustCreditBalance } from "@/lib/creditTerms";
import { awardOrderPoints } from "@/lib/loyalty";
import { notify } from "@/lib/notifications";
import { enforceRateLimit, rateLimit } from "@/lib/rateLimit";
import { formatINR } from "@/lib/format";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Create a wholesale (B2B) order. Prices are recomputed server-side
 * (calculateWholesaleCart) — the client's numbers are never trusted. Enforces
 * MOQ, the module toggle, delivery serviceability, and (for credit) the approved
 * credit limit. Reserves stock atomically, then persists with orderType:"wholesale".
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "wholesale-order", 20, 5 * 60 * 1000);
  if (limited) return limited;

  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const ctx = await getWholesalerUser();
  if (!ctx) {
    return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Idempotency: a repeated submit (double-click / retry) with the same key
  // within a short window is rejected before any stock or credit is touched.
  const idem =
    typeof body?.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 100) : "";
  if (idem) {
    const once = rateLimit(`widem:${ctx.user.id}:${idem}`, 1, 30 * 1000);
    if (!once.ok) {
      return NextResponse.json(
        { error: "This order was just submitted. Please check your orders before retrying." },
        { status: 409 }
      );
    }
  }

  const addrResult = validateAddress(body?.address);
  if ("error" in addrResult) {
    return NextResponse.json({ error: addrResult.error }, { status: 400 });
  }
  const delivery = checkPincode(addrResult.address.pincode);
  if (!delivery.serviceable) {
    return NextResponse.json(
      { error: "We don't deliver to this pincode yet." },
      { status: 400 }
    );
  }

  const paymentMethod = body?.paymentMethod === "credit" ? "credit" : "cod";
  const poNumber =
    typeof body?.poNumber === "string" ? body.poNumber.trim().slice(0, 60) : "";

  // Authoritative pricing — throws specific errors (MOQ, disabled module, etc.).
  let calc;
  try {
    calc = await calculateWholesaleCart(body?.items, ctx.profile.membershipTier);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not price the order." },
      { status: 400 }
    );
  }

  const total = calc.totals.grandTotal;

  // Credit path: require an approved line, then ATOMICALLY draw the amount — a
  // compare-and-swap that can never push the balance past the limit, even under
  // concurrent orders. Drawn before the order is persisted so it's never
  // uncharged, and released if a later step fails.
  let creditDueDate = "";
  let creditDrawn = false;
  if (paymentMethod === "credit") {
    const terms = await getCreditTerms(ctx.profile.id);
    if (!terms || terms.creditLimit <= 0) {
      return NextResponse.json(
        { error: "No approved credit line. Choose another payment method." },
        { status: 403 }
      );
    }
    const drawn = await drawCredit(ctx.profile.id, total);
    if (!drawn) {
      return NextResponse.json(
        {
          error: `Credit limit exceeded: ${formatINR(terms.available)} available, order is ${formatINR(total)}.`,
        },
        { status: 400 }
      );
    }
    creditDrawn = true;
    const due = new Date();
    due.setDate(due.getDate() + (terms.termsDays || 30));
    creditDueDate = due.toISOString().slice(0, 10);
  }

  const releaseCredit = async () => {
    if (creditDrawn) await adjustCreditBalance(ctx.profile.id, -total);
  };

  // Reserve stock atomically; roll back stock AND any drawn credit on shortfall.
  const reserved: { slug: string; qty: number }[] = [];
  for (const l of calc.lines) {
    const ok = await decrementStock(l.slug, l.qty);
    if (!ok) {
      await Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));
      await releaseCredit();
      return NextResponse.json(
        { error: `${l.name} just went out of stock. Please adjust the quantity.` },
        { status: 409 }
      );
    }
    reserved.push({ slug: l.slug, qty: l.qty });
  }

  const items: OrderItem[] = calc.lines.map((l) => ({
    slug: l.slug,
    name: l.name,
    brand: l.brand,
    image: l.image,
    price: l.unitPrice,
    mrp: l.mrp,
    qty: l.qty,
    gstRate: l.gstRate,
    vendorSlug: l.vendorSlug,
    vendorName: l.vendorName,
    commissionRate: l.commissionRate,
    fulfillmentStatus: "pending",
  }));

  let order;
  try {
    order = await createOrder(
      {
        user: ctx.user.id,
        items,
        address: addrResult.address,
        subtotal: calc.totals.subtotal,
        deliveryFee: calc.totals.deliveryFee,
        total,
        paymentMethod,
        status: paymentMethod === "credit" ? "credit_invoiced" : "confirmed",
        poNumber,
        creditDueDate,
        orderType: "wholesale",
      },
      new Date().toISOString()
    );
  } catch {
    // Order didn't persist — undo the stock reservation and credit draw.
    await Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));
    await releaseCredit();
    return NextResponse.json(
      { error: "Could not place the order. Please retry." },
      { status: 502 }
    );
  }

  // Best-effort side effects — a failure here must not undo a committed order.
  try {
    await awardOrderPoints(ctx.profile.id, order.total, order.id);
    await notify({
      userId: ctx.user.id,
      email: ctx.profile.email,
      type: "wholesale_order_placed",
      title: "Wholesale order placed",
      body: `Order #${order.id.slice(-6)} for ${formatINR(order.total)} is confirmed.`,
      meta: { orderId: order.id },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ order }, { status: 201 });
}
