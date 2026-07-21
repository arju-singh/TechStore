import "server-only";
import { RazorpayGateway } from "./razorpay";
import { StripeGateway } from "./stripe";
import { chooseGatewayId, type GatewayId, type PaymentGateway, type Currency } from "./types";

export * from "./types";

// One instance per gateway. Adding a new gateway is: implement PaymentGateway,
// add it here, and (if needed) extend chooseGatewayId's routing — nothing else
// in the app needs to change.
const GATEWAYS: Record<GatewayId, PaymentGateway> = {
  razorpay: new RazorpayGateway(),
  stripe: new StripeGateway(),
};

/** Which gateways currently have credentials. */
export function gatewayAvailability() {
  return {
    razorpay: GATEWAYS.razorpay.isConfigured(),
    stripe: GATEWAYS.stripe.isConfigured(),
  };
}

/** A specific gateway by id (throws if unknown). */
export function getGateway(id: GatewayId): PaymentGateway {
  const g = GATEWAYS[id];
  if (!g) throw new Error(`Unknown payment gateway: ${id}`);
  return g;
}

/**
 * The gateway to use for a currency (INR → Razorpay, else Stripe), honoring
 * which are actually configured. Throws a clear error if none can take the
 * payment, so checkout fails loud rather than silently.
 */
export function selectGateway(currency: Currency): PaymentGateway {
  const id = chooseGatewayId(currency, gatewayAvailability());
  if (!id) {
    throw new Error(
      `No payment gateway configured for ${currency}. Set Razorpay and/or Stripe keys.`
    );
  }
  return getGateway(id);
}

/** Summary of configured gateways — safe for a public "how can I pay?" response. */
export function configuredGateways(): { id: GatewayId; label: string }[] {
  return (Object.values(GATEWAYS) as PaymentGateway[])
    .filter((g) => g.isConfigured())
    .map((g) => ({ id: g.id, label: g.label }));
}
