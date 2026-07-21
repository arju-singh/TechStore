import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";
import { gatewayAvailability } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  // Which online gateways have live credentials — decided on the server so the
  // client only ever offers payment methods that can actually complete.
  const gateways = gatewayAvailability();
  return <CheckoutView gateways={gateways} />;
}
