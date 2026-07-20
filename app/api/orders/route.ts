import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProductBySlug, decrementStock, restoreStock } from "@/lib/products";
import {
  createOrder,
  attachRazorpayOrder,
  updateOrderStatus,
  getOrdersByUser,
  type OrderItem,
} from "@/lib/orders";
import { computeTotals, unitPriceFor, moqError, type PricingContext } from "@/lib/pricing";
import { getFlashPriceMap, applyFlashSale } from "@/lib/flashSales";
import { getVendorBySlug } from "@/lib/vendors";
import { resolveCommissionRate, platformCommissionRate } from "@/lib/payouts";
import { enforceRateLimit, rateLimit } from "@/lib/rateLimit";
import { validateAddress } from "@/lib/validation";
import { checkPincode } from "@/lib/delivery";
import { validateCoupon } from "@/lib/coupons";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  razorpayConfigured,
} from "@/lib/razorpay";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const orders = await getOrdersByUser(user.id);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  // Throttle order spam (and downstream Razorpay-order creation).
  const limited = enforceRateLimit(request, "order", 20, 5 * 60 * 1000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please log in to place an order." },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Idempotency: a repeated submit with the same key (e.g. a double-click or a
  // retried request) within a short window is rejected so we don't create two
  // orders and reserve stock twice.
  const idem =
    typeof body?.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 100) : "";
  if (idem) {
    const once = rateLimit(`idem:${user.id}:${idem}`, 1, 30 * 1000);
    if (!once.ok) {
      return NextResponse.json(
        { error: "This order was just submitted. Please check your orders before retrying." },
        { status: 409 }
      );
    }
  }

  // Address
  const addrResult = validateAddress(body?.address);
  if ("error" in addrResult) {
    return NextResponse.json({ error: addrResult.error }, { status: 400 });
  }

  // Delivery serviceability for the destination pincode.
  const delivery = checkPincode(addrResult.address.pincode);
  if (!delivery.serviceable) {
    return NextResponse.json(
      { error: "Sorry, we don't deliver to this pincode yet." },
      { status: 400 }
    );
  }

  // Payment method — COD, online (Razorpay), Net-30 credit or a quote request.
  // Credit & quote are B2B-only and gated on the session's wholesaler status.
  const paymentMethod = body?.paymentMethod ?? "cod";
  const VALID_METHODS = ["cod", "razorpay", "credit", "quote"];
  if (!VALID_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: "Unsupported payment method." },
      { status: 400 }
    );
  }
  const isB2BMethod = paymentMethod === "credit" || paymentMethod === "quote";
  if (isB2BMethod && !user.isWholesaler) {
    return NextResponse.json(
      { error: "Credit terms and quotes are available to approved wholesale accounts only." },
      { status: 403 }
    );
  }
  if (paymentMethod === "razorpay" && !razorpayConfigured) {
    return NextResponse.json(
      { error: "Online payment is not configured. Please use Cash on Delivery." },
      { status: 400 }
    );
  }
  if (paymentMethod === "cod" && !delivery.codAvailable) {
    return NextResponse.json(
      { error: "Cash on Delivery isn't available for this pincode. Please pay online." },
      { status: 400 }
    );
  }
  // Optional purchase-order reference for B2B orders.
  const poNumber =
    typeof body?.poNumber === "string" ? body.poNumber.trim().slice(0, 60) : "";

  // Pricing context is derived from the SESSION, never the request body — the
  // client cannot claim to be a wholesaler to unlock wholesale prices.
  const ctx: PricingContext = { isWholesaler: Boolean(user.isWholesaler) };

  // Sane per-line cap. Wholesale orders can be large, but this bounds abuse and
  // absurd totals; real limits are enforced by stock below.
  const MAX_LINE_QTY = 100000;

  // Items — trust ONLY the slug + qty from the client; resolve everything else
  // (name, price, mrp, stock) from the catalog so prices can't be tampered with.
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // Resolve each distinct vendor's commission rate once, snapshotting it onto
  // every line so payouts stay stable even if the vendor's rate later changes.
  const commissionByVendor = new Map<string, number>();
  const commissionFor = async (vendorSlug: string): Promise<number> => {
    if (!vendorSlug) return 0; // house product — no vendor commission
    const cached = commissionByVendor.get(vendorSlug);
    if (cached !== undefined) return cached;
    const vendor = await getVendorBySlug(vendorSlug);
    const rate = vendor ? resolveCommissionRate(vendor) : platformCommissionRate();
    commissionByVendor.set(vendorSlug, rate);
    return rate;
  };

  // Active flash-sale discounts, resolved once and applied server-side so the
  // charged price matches what the shopper saw — never trusted from the client.
  const flashMap = await getFlashPriceMap();

  const items: OrderItem[] = [];
  for (const raw of rawItems) {
    const slug = typeof raw?.slug === "string" ? raw.slug : "";
    const qty = Number(raw?.qty);
    if (!slug || !Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) {
      return NextResponse.json(
        { error: "Invalid item in cart." },
        { status: 400 }
      );
    }
    const rawProduct = await getProductBySlug(slug);
    if (!rawProduct) {
      return NextResponse.json(
        { error: `Product no longer available: ${slug}` },
        { status: 409 }
      );
    }
    const product = applyFlashSale(rawProduct, flashMap);
    if (product.stock < qty) {
      return NextResponse.json(
        { error: `Only ${product.stock} left of ${product.name}.` },
        { status: 409 }
      );
    }
    // Enforce minimum order quantity when a wholesaler is getting wholesale price.
    const mErr = moqError(product, qty, ctx, product.name);
    if (mErr) {
      return NextResponse.json({ error: mErr }, { status: 400 });
    }
    // Effective per-unit price resolved server-side from the catalog + context.
    const unitPrice = unitPriceFor(product, qty, ctx);
    const vendorSlug = product.vendorSlug ?? "";
    items.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: unitPrice,
      mrp: product.mrp,
      qty,
      gstRate: typeof product.gstRate === "number" ? product.gstRate : 18,
      vendorSlug,
      vendorName: product.vendorName ?? "",
      commissionRate: await commissionFor(vendorSlug),
      fulfillmentStatus: "pending",
    });
  }

  // Adapt catalog-priced order items into pricing lines for the totals math.
  const pricedLines = items.map((it) => ({
    unitPrice: it.price,
    mrp: it.mrp,
    qty: it.qty,
  }));

  // Re-validate any coupon against the SERVER-computed subtotal — the client's
  // claimed discount is never trusted.
  const baseTotals = computeTotals(pricedLines);
  let couponCode = "";
  let couponDiscount = 0;
  if (typeof body?.couponCode === "string" && body.couponCode.trim()) {
    const result = await validateCoupon(body.couponCode, baseTotals.subtotal);
    if (result.valid) {
      couponCode = result.code;
      couponDiscount = result.discount;
    }
    // An invalid coupon is silently ignored (order proceeds at full price)
    // rather than blocking checkout.
  }
  const totals = computeTotals(pricedLines, couponDiscount);

  // Quote request — a B2B enquiry, not a committed order: no stock is reserved
  // and no payment is taken. It sits as "quote_requested" for an admin to price
  // and confirm.
  if (paymentMethod === "quote") {
    const order = await createOrder(
      {
        user: user.id,
        items,
        address: addrResult.address,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.grandTotal,
        couponCode,
        couponDiscount,
        paymentMethod: "quote",
        status: "quote_requested",
        poNumber,
      },
      new Date().toISOString()
    );
    return NextResponse.json({ order }, { status: 201 });
  }

  // Atomically reserve stock for every line before creating the order, so two
  // concurrent orders can't oversell. If any line can't be reserved, roll back
  // the ones already taken and fail — nothing is half-committed.
  const reserved: { slug: string; qty: number }[] = [];
  for (const it of items) {
    const ok = await decrementStock(it.slug, it.qty);
    if (!ok) {
      await Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));
      return NextResponse.json(
        { error: `${it.name} just went out of stock. Please adjust the quantity.` },
        { status: 409 }
      );
    }
    reserved.push({ slug: it.slug, qty: it.qty });
  }
  const releaseStock = () =>
    Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));

  // COD → confirmed immediately. Razorpay → create a pending order, then a
  // matching Razorpay order the client pays for; it becomes "paid" only after
  // /api/payments/verify confirms the signature.
  if (paymentMethod === "cod") {
    const order = await createOrder(
      {
        user: user.id,
        items,
        address: addrResult.address,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.grandTotal,
        couponCode,
        couponDiscount,
        paymentMethod: "cod",
        status: "confirmed",
        poNumber,
      },
      new Date().toISOString()
    );
    return NextResponse.json({ order }, { status: 201 });
  }

  // Net-30 credit (approved wholesalers) → confirmed immediately, invoiced with a
  // due date 30 days out. Stock is already reserved above.
  if (paymentMethod === "credit") {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const order = await createOrder(
      {
        user: user.id,
        items,
        address: addrResult.address,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        total: totals.grandTotal,
        couponCode,
        couponDiscount,
        paymentMethod: "credit",
        status: "credit_invoiced",
        poNumber,
        creditDueDate: due.toISOString().slice(0, 10),
      },
      new Date().toISOString()
    );
    return NextResponse.json({ order }, { status: 201 });
  }

  // Razorpay: create our pending order first so we have an id for the receipt.
  const pending = await createOrder(
    {
      user: user.id,
      items,
      address: addrResult.address,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.grandTotal,
      couponCode,
      couponDiscount,
      paymentMethod: "razorpay",
      status: "pending",
    },
    new Date().toISOString()
  );

  let rzpOrder;
  try {
    rzpOrder = await createRazorpayOrder(totals.grandTotal, pending.id);
  } catch (err) {
    // Payment couldn't start — release the reserved stock and cancel the order
    // so nothing stays locked behind a checkout that never completes.
    await releaseStock();
    await updateOrderStatus(pending.id, "cancelled");
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not start online payment.",
      },
      { status: 502 }
    );
  }

  // Persist the Razorpay order id on our order for later cross-checking.
  const order = (await attachRazorpayOrder(pending.id, rzpOrder.id)) ?? {
    ...pending,
    razorpayOrderId: rzpOrder.id,
  };

  return NextResponse.json(
    {
      order,
      razorpay: {
        orderId: rzpOrder.id,
        keyId: getRazorpayKeyId(),
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
    },
    { status: 201 }
  );
}
