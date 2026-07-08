import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  // Owner-only: return 404 (not 403) for other users' orders so their
  // existence isn't revealed.
  if (!order || order.user !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order });
}
