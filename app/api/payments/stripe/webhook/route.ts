import { NextResponse } from "next/server";
import {
  verifyStripeWebhookSignature,
  stripeWebhookSecret,
  paidReceiptFromStripeEvent,
} from "@/lib/payments/stripe";
import { getOrderById, updateOrderStatus } from "@/lib/orders";

/**
 * Stripe webhook receiver. Verifies the `Stripe-Signature` against the endpoint
 * secret (the raw body must be read unparsed for signature verification), then
 * marks the referenced order paid. Hosted Checkout fires
 * `checkout.session.completed`; a direct PaymentIntent fires
 * `payment_intent.succeeded` — both carry our order id in `metadata.receipt`, so
 * either confirms the order. Idempotent (a re-delivered event is a no-op) and
 * always 200 on a handled/ignored event so Stripe doesn't retry unnecessarily.
 */
export const dynamic = "force-dynamic";

/** Marks the order referenced by `metadata.receipt` paid, tolerating any error. */
async function markReceiptPaid(receipt: string | undefined) {
  if (!receipt) return;
  try {
    const order = await getOrderById(receipt);
    if (order && order.status !== "paid") {
      await updateOrderStatus(receipt, "paid");
    }
  } catch {
    // Never fail the webhook on a lookup error — Stripe would retry forever.
  }
}

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature") || "";
  const rawBody = await request.text();

  if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  // Only a genuinely-paid event yields an order id to confirm; everything else
  // is acknowledged and ignored.
  await markReceiptPaid(paidReceiptFromStripeEvent(event) ?? undefined);

  return NextResponse.json({ received: true });
}
