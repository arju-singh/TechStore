import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";

const ALLOWED: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "quote_requested",
  "quoted",
  "credit_invoiced",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body?.status;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const order = await updateOrderStatus(id, status);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ order });
}
