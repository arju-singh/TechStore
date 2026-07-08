import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import VendorSettingsForm from "@/components/vendor/VendorSettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function VendorSettingsPage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Store settings</h1>
      <p className="mt-1 text-sm text-white/50">
        This is what shoppers see on your storefront.
      </p>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <VendorSettingsForm vendor={ctx.vendor} />
      </div>
    </div>
  );
}
