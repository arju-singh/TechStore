/**
 * Payment-gateway abstraction — shared, client-safe types and pure helpers.
 * No secrets, no node built-ins here, so this module is safe to import from
 * client components (e.g. to render the right checkout button). The concrete
 * gateways (Razorpay, Stripe) live in server-only modules that implement
 * `PaymentGateway` below.
 */

export type GatewayId = "razorpay" | "stripe";
export type Currency = string; // ISO 4217, e.g. "INR", "USD", "EUR"

/** Which gateways currently have credentials configured. */
export interface GatewayAvailability {
  razorpay: boolean;
  stripe: boolean;
}

export interface CreatePaymentInput {
  /** Amount in MAJOR units (e.g. rupees, dollars) — never minor units here. */
  amount: number;
  currency: Currency;
  /** Our internal order id, echoed back for reconciliation. */
  receipt: string;
  customer?: { name?: string; email?: string; phone?: string };
  /** Where a redirect-based gateway (Stripe Checkout) returns the shopper. */
  returnUrls?: { success: string; cancel: string };
}

/**
 * What the browser needs to launch checkout. Contains only publishable values
 * (order ids, publishable keys, redirect URLs) — never a secret key.
 */
export interface PaymentSession {
  gateway: GatewayId;
  currency: Currency;
  amount: number;
  /** Razorpay: launch the embedded checkout widget with these. */
  razorpay?: { orderId: string; keyId: string };
  /** Stripe: redirect the browser to this hosted Checkout page. */
  stripe?: { checkoutUrl: string };
}

/** Gateway-specific proof of a completed payment, verified server-side. */
export interface VerifyInput {
  razorpay?: { orderId: string; paymentId: string; signature: string };
  stripe?: { paymentIntentId: string };
}

export interface VerifyResult {
  ok: boolean;
  /** The gateway's payment id, when verified. */
  paymentId?: string;
  reason?: string;
}

/** The contract every payment gateway implements (server-side). */
export interface PaymentGateway {
  readonly id: GatewayId;
  readonly label: string;
  /** True when the required env credentials are present. */
  isConfigured(): boolean;
  /** Currencies this gateway is used for in our routing. */
  supportsCurrency(currency: Currency): boolean;
  /** Create a payment order/intent and return client-launchable session data. */
  createSession(input: CreatePaymentInput): Promise<PaymentSession>;
  /** Verify a completed payment server-side (signature or intent status). */
  verify(input: VerifyInput): Promise<VerifyResult>;
}

const ZERO_DECIMAL = new Set([
  "JPY", "KRW", "VND", "CLP", "PYG", "XAF", "XOF", "BIF", "DJF", "GNF",
  "KMF", "MGA", "RWF", "UGX", "VUV", "XPF",
]);

/**
 * Convert a major-unit amount to the smallest currency unit the gateway expects
 * (paise / cents). Zero-decimal currencies (JPY, etc.) are passed through.
 */
export function toMinorUnits(amount: number, currency: Currency): number {
  const cur = (currency || "").toUpperCase();
  if (ZERO_DECIMAL.has(cur)) return Math.round(amount);
  return Math.round(amount * 100);
}

/**
 * Route a payment to a gateway by currency: INR → Razorpay (India), everything
 * else → Stripe (international). Falls back to whichever single gateway is
 * configured, so a store with only one set of keys still works. Returns null
 * when no gateway is configured.
 */
export function chooseGatewayId(
  currency: Currency,
  available: GatewayAvailability
): GatewayId | null {
  const cur = (currency || "").toUpperCase();
  if (cur === "INR" && available.razorpay) return "razorpay";
  if (available.stripe) return "stripe";
  if (available.razorpay) return "razorpay";
  return null;
}
