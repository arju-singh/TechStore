import type { Metadata } from "next";
import { getWholesaleSettings } from "@/lib/wholesaleSettings";
import WholesaleSettingsForm from "@/components/admin/WholesaleSettingsForm";

export const metadata: Metadata = { title: "Wholesale settings" };

export default async function AdminWholesaleSettingsPage() {
  const settings = await getWholesaleSettings();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesale settings</h1>
        <p className="mt-1 text-sm text-white/50">
          Platform-wide controls for the wholesale module.
        </p>
      </div>
      <div className="max-w-xl rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <WholesaleSettingsForm initial={settings} />
      </div>
    </div>
  );
}
