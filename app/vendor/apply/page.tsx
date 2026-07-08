import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorContext } from "@/lib/auth";
import VendorApplyForm from "@/components/vendor/VendorApplyForm";

export const metadata: Metadata = { title: "Become a seller" };

export default async function VendorApplyPage() {
  const { user, vendor } = await getVendorContext();
  if (!user) redirect("/login?next=/vendor/apply");
  // Already has a store (any status) — send them to the dashboard, which shows
  // their current state. No re-applying.
  if (vendor) redirect("/vendor");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Sell on TechStore</h1>
      <p className="mt-1 text-sm text-white/50">
        Open your own storefront on the marketplace. Tell us about your store —
        an admin reviews new sellers before they go live. You can edit everything
        later from Settings.
      </p>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <VendorApplyForm defaultEmail={user.email} />
      </div>
    </div>
  );
}
