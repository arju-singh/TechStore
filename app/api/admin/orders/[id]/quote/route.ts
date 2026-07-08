import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getOrderById, updateOrderFields } from "@/lib/orders";

/**
 * Admin responds to a quote request with a quoted price (and optional note). The
 * order moves to "quoted"; the customer can then accept it (see
 * /api/orders/[id]/accept-quote). Only a quote_requested order can be quoted.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "quote_requested" && order.status !== "quoted") {
    return NextResponse.json(
      { error: "This order isn't awaiting a quote." },
      { status: 409 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const quotedTotal = Number(body?.quotedTotal);
  if (!Number.isFinite(quotedTotal) || quotedTotal <= 0) {
    return NextResponse.json(
      { error: "Enter a valid quoted total." },
      { status: 400 }
    );
  }
  const quoteNote =
    typeof body?.quoteNote === "string" ? body.quoteNote.trim().slice(0, 500) : "";

  const updated = await updateOrderFields(id, {
    status: "quoted",
    quotedTotal: Math.round(quotedTotal),
    quoteNote,
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not save the quote." }, { status: 500 });
  }
  return NextResponse.json({ order: updated });
}
