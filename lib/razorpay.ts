import "server-only";
import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export const razorpayConfigured = Boolean(KEY_ID && KEY_SECRET);

/** The publishable key id, safe to expose to the browser checkout. */
export function getRazorpayKeyId(): string {
  return KEY_ID;
}

export interface RazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  status: string;
}

/**
 * Create an order on Razorpay. `amountRupees` is converted to paise. `receipt`
 * ties it back to our internal order id. Uses HTTP Basic auth (key_id:secret)
 * so we don't need the Razorpay SDK dependency.
 */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string
): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt,
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Razorpay order creation failed (${res.status}): ${detail.slice(0, 200)}`
    );
  }
  return res.json();
}

/**
 * Verify the signature Razorpay returns to the client after a successful
 * payment. signature === HMAC_SHA256(razorpay_order_id|razorpay_payment_id,
 * key_secret). Constant-time comparison to avoid timing leaks.
 */
export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(input.signature || "", "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
