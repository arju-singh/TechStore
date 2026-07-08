import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { getProducts } from "@/lib/products";
import WholesaleProductCard from "@/components/wholesale/WholesaleProductCard";

export const metadata: Metadata = { title: "Catalog" };

export default async function WholesaleCatalogPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");

  const all = await getProducts();
  const products = all.filter((p) => p.wholesale?.enabled);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesale catalog</h1>
        <p className="mt-1 text-sm text-white/50">
          {products.length} products available at wholesale tiers. Prices drop as
          quantity rises.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No products are enabled for wholesale yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <WholesaleProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
