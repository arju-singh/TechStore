import type { Metadata } from "next";
import { getProducts, hasBulkPricing } from "@/lib/products";
import PricingRow from "@/components/admin/PricingRow";

export const metadata: Metadata = { title: "Bulk pricing" };

export default async function AdminPricingPage() {
  const products = await getProducts({ sort: "featured" });
  const withBulk = products.filter(hasBulkPricing).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bulk &amp; wholesale pricing</h1>
        <p className="mt-1 text-sm text-white/50">
          {withBulk} of {products.length} products have volume or wholesale pricing.
          Edit tiers, wholesale price/MOQ and GST inline — “Auto” fills sensible
          defaults from the base price.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="px-3 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">GST%</th>
                <th className="px-3 py-3 font-semibold">Volume tiers (minQty:price)</th>
                <th className="px-3 py-3 font-semibold">Wholesale</th>
                <th className="px-3 py-3 font-semibold">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((p) => (
                <PricingRow key={p.slug} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
