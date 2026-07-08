import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { listTemplates } from "@/lib/orderTemplates";
import BulkOrderTools from "@/components/wholesale/BulkOrderTools";

export const metadata: Metadata = { title: "Templates" };

export default async function WholesaleTemplatesPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const templates = await listTemplates(ctx.profile.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bulk ordering</h1>
        <p className="mt-1 text-sm text-white/50">
          Save order templates, reorder in one click, or bulk-upload a CSV.
        </p>
      </div>
      <BulkOrderTools templates={templates} />
    </div>
  );
}
