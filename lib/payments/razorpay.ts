import "server-only";
import {
  razorpayConfigured,
  getRazorpayKeyId,
  createRazorpayOrder,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import type {
  CreatePaymentInput,
  PaymentGateway,
  PaymentSession,
  VerifyInput,
  VerifyResult,
} from "./types";

/**
 * Razorpay gateway (India). Thin adapter over the existing lib/razorpay client
 * (HTTP Basic + HMAC-SHA256 signature verify, no SDK) so the order pipeline can
 * treat every gateway uniformly. Razorpay orders are always INR.
 */
export class RazorpayGateway implements PaymentGateway {
  readonly id = "razorpay" as const;
  readonly label = "Razorpay";

  isConfigured(): boolean {
    return razorpayConfigured;
  }

  supportsCurrency(currency: string): boolean {
    return (currency || "").toUpperCase() === "INR";
  }

  async createSession(input: CreatePaymentInput): Promise<PaymentSession> {
    if (!this.isConfigured()) {
      throw new Error("Razorpay is not configured.");
    }
    const order = await createRazorpayOrder(input.amount, input.receipt);
    return {
      gateway: this.id,
      currency: "INR",
      amount: input.amount,
      razorpay: { orderId: order.id, keyId: getRazorpayKeyId() },
    };
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const r = input.razorpay;
    if (!r?.orderId || !r?.paymentId || !r?.signature) {
      return { ok: false, reason: "Missing Razorpay verification fields." };
    }
    const ok = verifyPaymentSignature({
      razorpayOrderId: r.orderId,
      razorpayPaymentId: r.paymentId,
      signature: r.signature,
    });
    return ok
      ? { ok: true, paymentId: r.paymentId }
      : { ok: false, reason: "Invalid Razorpay signature." };
  }
}
