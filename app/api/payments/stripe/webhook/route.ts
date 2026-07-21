import { NextResponse } from "next/server";
import { verifyStripeWebhookSignature, stripeWebhookSecret } from "@/lib/payments/stripe";
import { getOrderById, updateOrderStatus } from "@/lib/orders";

/**
 * Stripe webhook receiver. Verifies the `Stripe-Signature` against the endpoint
 * secret (the raw body must be read unparsed for signature verification), then
 * marks the referenced order paid on `payment_intent.succeeded`. Idempotent —
 * a re-delivered event is a no-op. Always 200 on a handled/ignored event so
 * Stripe doesn't retry unnecessarily.
 */
export const dynamic = "force-dynamic";

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

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  if (event?.type === "payment_intent.succeeded") {
    const intent = event.data?.object ?? {};
    const orderId: string | undefined = intent?.metadata?.receipt;
    if (orderId) {
      try {
        const order = await getOrderById(orderId);
        if (order && order.status !== "paid") {
          await updateOrderStatus(orderId, "paid");
        }
      } catch {
        // Never fail the webhook on a lookup error — Stripe would retry forever.
      }
    }
  }

  return NextResponse.json({ received: true });
}
