import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById, updateOrderFields } from "@/lib/orders";
import { decrementStock, restoreStock } from "@/lib/products";

/**
 * The customer accepts an admin's quote. The order (which reserved no stock as a
 * quote request) now reserves stock and converts to a payable Net-30 credit
 * order at the quoted total. Owner-gated; only a "quoted" order can be accepted.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  const order = await getOrderById(id);
  if (!order || order.user !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "quoted") {
    return NextResponse.json(
      { error: "This quote isn't ready to accept yet." },
      { status: 409 }
    );
  }
  if (order.quotedTotal <= 0) {
    return NextResponse.json({ error: "This quote has no price set." }, { status: 409 });
  }

  // Reserve stock now (quotes don't hold stock). Roll back on any shortfall.
  const reserved: { slug: string; qty: number }[] = [];
  for (const it of order.items) {
    const ok = await decrementStock(it.slug, it.qty);
    if (!ok) {
      await Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));
      return NextResponse.json(
        { error: `${it.name} is no longer in stock in the required quantity.` },
        { status: 409 }
      );
    }
    reserved.push({ slug: it.slug, qty: it.qty });
  }

  const due = new Date();
  due.setDate(due.getDate() + 30);
  // Model the negotiated quote as a discount so the summary, GST breakup and
  // invoice all reconcile (subtotal + delivery − discount = quoted total).
  const quoteDiscount = Math.max(0, order.total - order.quotedTotal);
  const updated = await updateOrderFields(id, {
    status: "credit_invoiced",
    paymentMethod: "credit",
    total: order.quotedTotal,
    couponCode: "QUOTE",
    couponDiscount: quoteDiscount,
    creditDueDate: due.toISOString().slice(0, 10),
  });
  if (!updated) {
    await Promise.all(reserved.map((r) => restoreStock(r.slug, r.qty)));
    return NextResponse.json({ error: "Could not accept the quote." }, { status: 500 });
  }
  return NextResponse.json({ order: updated });
}
