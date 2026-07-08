import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAllOrders } from "@/lib/orders";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const orders = await getAllOrders();
  return NextResponse.json({ orders });
}
