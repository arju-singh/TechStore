import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import {
  updateVendorItemFulfillment,
  type FulfillmentStatus,
} from "@/lib/orders";

const STATUSES: FulfillmentStatus[] = ["pending", "shipped", "delivered"];

/**
 * Vendor: advance the fulfillment status of their lines in an order. Scoped to
 * the caller's vendor slug, so a vendor can only move their own items — never
 * another store's lines in the same shared order.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body?.fulfillmentStatus as FulfillmentStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const order = await updateVendorItemFulfillment(id, ctx.vendor.slug, status);
  if (!order) {
    // Either the order doesn't exist or it has none of this vendor's items.
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
