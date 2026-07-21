import "server-only";
import crypto from "node:crypto";
import type {
  CreatePaymentInput,
  PaymentGateway,
  PaymentSession,
  VerifyInput,
  VerifyResult,
} from "./types";
import { toMinorUnits } from "./types";

const SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const STRIPE_API = "https://api.stripe.com/v1";

/** Flatten a nested params object into Stripe's bracketed form-encoding. */
function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") {
      parts.push(formEncode(value as Record<string, unknown>, k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function stripeFetch(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? formEncode(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.error?.message || `Stripe request failed (${res.status})`;
    // Log server-side detail; surface a generic message to callers.
    throw new Error(msg);
  }
  return json as any;
}

/**
 * Verify a Stripe webhook signature (the `Stripe-Signature` header). The header
 * is `t=<unix>,v1=<hex hmac>` where the HMAC is SHA-256 of `${t}.${rawBody}`
 * keyed by the endpoint's signing secret. Pure + timing-safe; `now`/`tolerance`
 * are injectable for testing. Returns false on any malformed/expired input.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  opts: { now?: number; toleranceSec?: number } = {}
): boolean {
  if (!secret || !signatureHeader) return false;
  const now = opts.now ?? Date.now();
  const tolerance = (opts.toleranceSec ?? 300) * 1000;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(now - t * 1000) > tolerance) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Given a *verified* Stripe webhook event, return the order id (`metadata.receipt`)
 * that the event confirms as paid, or null to ignore it. Hosted Checkout fires
 * `checkout.session.completed`, which we additionally require to be
 * `payment_status: "paid"` (async payment methods can complete the session while
 * still unpaid). A direct `payment_intent.succeeded` is already terminal. Pure —
 * signature verification is the caller's responsibility.
 */
export function paidReceiptFromStripeEvent(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const e = event as { type?: string; data?: { object?: any } };
  const obj = e.data?.object ?? {};
  const receipt = obj?.metadata?.receipt;
  if (typeof receipt !== "string" || !receipt) return null;
  if (e.type === "payment_intent.succeeded") return receipt;
  if (e.type === "checkout.session.completed" && obj?.payment_status === "paid") {
    return receipt;
  }
  return null;
}

/**
 * Stripe gateway (international). Creates a hosted Checkout Session and verifies
 * via intent status; webhooks are verified with `verifyStripeWebhookSignature`.
 * Uses the raw REST API over fetch — no SDK dependency, matching the Razorpay
 * client.
 */
export class StripeGateway implements PaymentGateway {
  readonly id = "stripe" as const;
  readonly label = "Stripe";

  isConfigured(): boolean {
    return Boolean(SECRET_KEY && PUBLISHABLE_KEY);
  }

  supportsCurrency(currency: string): boolean {
    // Used for non-INR (international) traffic in our routing.
    return (currency || "").toUpperCase() !== "INR";
  }

  async createSession(input: CreatePaymentInput): Promise<PaymentSession> {
    if (!this.isConfigured()) throw new Error("Stripe is not configured.");
    if (!input.returnUrls) {
      throw new Error("Stripe Checkout needs success/cancel return URLs.");
    }
    // Hosted Checkout Session — the shopper is redirected to Stripe's PCI-hosted
    // page (no card data touches us, no Stripe.js needed). `receipt` is stamped
    // on both the session and the payment intent so the webhook can reconcile.
    const session = await stripeFetch("/checkout/sessions", "POST", {
      mode: "payment",
      success_url: input.returnUrls.success,
      cancel_url: input.returnUrls.cancel,
      customer_email: input.customer?.email,
      client_reference_id: input.receipt,
      metadata: { receipt: input.receipt },
      payment_intent_data: { metadata: { receipt: input.receipt } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: toMinorUnits(input.amount, input.currency),
            product_data: { name: `TechStore order ${input.receipt.slice(-8)}` },
          },
        },
      ],
    });
    return {
      gateway: this.id,
      currency: input.currency,
      amount: input.amount,
      stripe: { checkoutUrl: session.url },
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const s = input.stripe;
    if (!s?.paymentIntentId) {
      return { ok: false, reason: "Missing Stripe payment intent id." };
    }
    const intent = await stripeFetch(`/payment_intents/${s.paymentIntentId}`, "GET");
    return intent.status === "succeeded"
      ? { ok: true, paymentId: intent.id }
      : { ok: false, reason: `Stripe intent status: ${intent.status}` };
  }
}

export function stripeWebhookSecret(): string {
  return WEBHOOK_SECRET;
}
