import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { chooseGatewayId, toMinorUnits } from "@/lib/payments/types";
import { verifyStripeWebhookSignature } from "@/lib/payments/stripe";
import { gatewayAvailability, selectGateway, configuredGateways } from "@/lib/payments";

describe("chooseGatewayId (currency routing)", () => {
  const both = { razorpay: true, stripe: true };
  it("routes INR to Razorpay, everything else to Stripe", () => {
    expect(chooseGatewayId("INR", both)).toBe("razorpay");
    expect(chooseGatewayId("inr", both)).toBe("razorpay");
    expect(chooseGatewayId("USD", both)).toBe("stripe");
    expect(chooseGatewayId("EUR", both)).toBe("stripe");
  });
  it("falls back to whichever single gateway is configured", () => {
    expect(chooseGatewayId("USD", { razorpay: true, stripe: false })).toBe("razorpay");
    expect(chooseGatewayId("INR", { razorpay: false, stripe: true })).toBe("stripe");
  });
  it("returns null when nothing is configured", () => {
    expect(chooseGatewayId("INR", { razorpay: false, stripe: false })).toBeNull();
  });
});

describe("toMinorUnits", () => {
  it("converts 2-decimal currencies to cents/paise", () => {
    expect(toMinorUnits(169900, "INR")).toBe(16990000);
    expect(toMinorUnits(19.99, "USD")).toBe(1999);
  });
  it("passes zero-decimal currencies through", () => {
    expect(toMinorUnits(500, "JPY")).toBe(500);
  });
});

describe("verifyStripeWebhookSignature", () => {
  const secret = "whsec_test_secret";
  const payload = '{"id":"evt_1","type":"payment_intent.succeeded"}';
  const t = 1_700_000_000;
  const sign = (body: string, ts = t, key = secret) =>
    crypto.createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
  const now = t * 1000;

  it("accepts a valid signature within tolerance", () => {
    const header = `t=${t},v1=${sign(payload)}`;
    expect(verifyStripeWebhookSignature(payload, header, secret, { now })).toBe(true);
  });
  it("rejects a tampered payload", () => {
    const header = `t=${t},v1=${sign(payload)}`;
    expect(verifyStripeWebhookSignature(payload + " ", header, secret, { now })).toBe(false);
  });
  it("rejects the wrong secret", () => {
    const header = `t=${t},v1=${sign(payload, t, "whsec_other")}`;
    expect(verifyStripeWebhookSignature(payload, header, secret, { now })).toBe(false);
  });
  it("rejects an expired timestamp", () => {
    const header = `t=${t},v1=${sign(payload)}`;
    expect(verifyStripeWebhookSignature(payload, header, secret, { now: now + 10 * 60 * 1000 })).toBe(false);
  });
  it("rejects malformed / missing headers", () => {
    expect(verifyStripeWebhookSignature(payload, `t=${t}`, secret, { now })).toBe(false);
    expect(verifyStripeWebhookSignature(payload, "", secret, { now })).toBe(false);
    expect(verifyStripeWebhookSignature(payload, `t=${t},v1=abc`, "", { now })).toBe(false);
  });
});

describe("gateway registry (no keys configured in tests)", () => {
  it("reports nothing configured and fails loud on selection", () => {
    expect(gatewayAvailability()).toEqual({ razorpay: false, stripe: false });
    expect(configuredGateways()).toEqual([]);
    expect(() => selectGateway("INR")).toThrow(/no payment gateway/i);
  });
});
