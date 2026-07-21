import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById, markOrderPaid } from "@/lib/orders";
import { getGateway } from "@/lib/payments";

// Verifying a payment signature and marking the order paid must not be cut off
// by the default serverless timeout — give it headroom.
export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    orderId, // our internal order id
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body ?? {};

  if (
    typeof orderId !== "string" ||
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing payment verification fields." },
      { status: 400 }
    );
  }

  const order = await getOrderById(orderId);
  // Owner-only, and the Razorpay order id must match what we created for it.
  if (!order || order.user !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
    return NextResponse.json(
      { error: "Payment does not match this order." },
      { status: 400 }
    );
  }

  const result = await getGateway("razorpay").verify({
    razorpay: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 400 }
    );
  }

  const paid = await markOrderPaid(orderId, razorpay_payment_id);
  return NextResponse.json({ order: paid });
}
