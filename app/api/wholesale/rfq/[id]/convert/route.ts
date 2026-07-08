import { NextResponse } from "next/server";
import { getWholesalerUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getRfqById, markRfqConverted, claimRfqForConversion } from "@/lib/rfqs";
import { getProductBySlug, decrementStock, restoreStock } from "@/lib/products";
import { getWholesaleSettings } from "@/lib/wholesaleSettings";
import { getCreditTerms, drawCredit, adjustCreditBalance } from "@/lib/creditTerms";
import { awardOrderPoints } from "@/lib/loyalty";
import { validateAddress } from "@/lib/validation";
import { checkPincode } from "@/lib/delivery";
import { deliveryFeeFor } from "@/lib/pricing";
import { createOrder, type OrderItem } from "@/lib/orders";
import { notify } from "@/lib/notifications";
import { formatINR } from "@/lib/format";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

/**
 * Convert an accepted / countered RFQ into a wholesale order at the AGREED
 * per-unit price (server-authoritative — the agreed price comes from the RFQ
 * record, never the client). One line for the requested quantity.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const ctx = await getWholesalerUser();
  if (!ctx) return NextResponse.json({ error: "Approved wholesalers only." }, { status: 403 });

  const { id } = await params;
  const rfq = await getRfqById(id);
  if (!rfq || rfq.wholesalerId !== ctx.profile.id) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }
  if (rfq.convertedOrderId) {
    return NextResponse.json(
      { error: "This RFQ has already been converted to an order." },
      { status: 409 }
    );
  }
  if (rfq.status !== "accepted" && rfq.status !== "countered") {
    return NextResponse.json(
      { error: "This RFQ isn't ready to order yet." },
      { status: 400 }
    );
  }
  if (!(rfq.agreedPrice > 0)) {
    return NextResponse.json({ error: "No agreed price on this RFQ." }, { status: 400 });
  }

  const product = await getProductBySlug(rfq.productSlug);
  if (!product) {
    return NextResponse.json({ error: "Product is no longer available." }, { status: 409 });
  }
  // Enforce the product MOQ here too — every other wholesale entry point does.
  const moq = product.wholesale?.moq ?? 1;
  if (rfq.requestedQty < moq) {
    return NextResponse.json(
      { error: `Minimum wholesale order for ${product.name} is ${moq} units.` },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const addrResult = validateAddress(body?.address);
  if ("error" in addrResult) {
    return NextResponse.json({ error: addrResult.error }, { status: 400 });
  }
  const delivery = checkPincode(addrResult.address.pincode);
  if (!delivery.serviceable) {
    return NextResponse.json({ error: "We don't deliver to this pincode yet." }, { status: 400 });
  }

  const qty = rfq.requestedQty;
  const unitPrice = rfq.agreedPrice;
  const subtotal = unitPrice * qty;
  const deliveryFee = deliveryFeeFor(subtotal);
  const total = subtotal + deliveryFee;
  const paymentMethod = body?.paymentMethod === "credit" ? "credit" : "cod";

  // Atomically claim the RFQ before any side effect. Only one of N concurrent
  // converts (double-click / retry) wins; the rest get 409 and do nothing —
  // no double order, stock, or credit draw.
  const claimed = await claimRfqForConversion(id);
  if (!claimed) {
    return NextResponse.json(
      { error: "This RFQ has already been converted to an order." },
      { status: 409 }
    );
  }
  const releaseClaim = () => markRfqConverted(id, ""); // undo the claim on failure

  // Credit: atomic compare-and-swap draw, before the order is persisted.
  let creditDueDate = "";
  let creditDrawn = false;
  if (paymentMethod === "credit") {
    const terms = await getCreditTerms(ctx.profile.id);
    if (!terms || terms.creditLimit <= 0) {
      await releaseClaim();
      return NextResponse.json({ error: "No approved credit line." }, { status: 403 });
    }
    const drawn = await drawCredit(ctx.profile.id, total);
    if (!drawn) {
      await releaseClaim();
      return NextResponse.json(
        { error: `Credit limit exceeded: ${formatINR(terms.available)} available.` },
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

  const ok = await decrementStock(rfq.productSlug, qty);
  if (!ok) {
    await releaseCredit();
    await releaseClaim();
    return NextResponse.json(
      { error: `${product.name} doesn't have ${qty} in stock right now.` },
      { status: 409 }
    );
  }

  const settings = await getWholesaleSettings();
  const item: OrderItem = {
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.image,
    price: unitPrice,
    mrp: product.mrp,
    qty,
    gstRate: typeof product.gstRate === "number" ? product.gstRate : 18,
    vendorSlug: product.vendorSlug ?? "",
    vendorName: product.vendorName ?? "",
    commissionRate: settings.wholesaleCommissionPercent,
    fulfillmentStatus: "pending",
  };

  let order;
  try {
    order = await createOrder(
      {
        user: ctx.user.id,
        items: [item],
        address: addrResult.address,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        status: paymentMethod === "credit" ? "credit_invoiced" : "confirmed",
        creditDueDate,
        orderType: "wholesale",
      },
      new Date().toISOString()
    );
  } catch {
    await restoreStock(rfq.productSlug, qty);
    await releaseCredit();
    await releaseClaim();
    return NextResponse.json(
      { error: "Could not place the order. Please retry." },
      { status: 502 }
    );
  }

  // Replace the "pending" claim with the real order id.
  await markRfqConverted(id, order.id);

  // Best-effort side effects — must not undo a committed order.
  try {
    await awardOrderPoints(ctx.profile.id, order.total, order.id);
    await notify({
      userId: ctx.user.id,
      email: ctx.profile.email,
      type: "rfq_converted",
      title: "Quote converted to order",
      body: `Order #${order.id.slice(-6)} placed at the agreed price (${formatINR(total)}).`,
      meta: { orderId: order.id, rfqId: rfq.id },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ order }, { status: 201 });
}
