import type { Metadata } from "next";
import { getAllFlashSales } from "@/lib/flashSales";
import { getProducts } from "@/lib/products";
import FlashSaleManager from "@/components/admin/FlashSaleManager";

export const metadata: Metadata = { title: "Flash sales" };

export default async function AdminFlashSalesPage() {
  const [sales, products] = await Promise.all([getAllFlashSales(), getProducts()]);
  const productLite = products.map((p) => ({ slug: p.slug, name: p.name, price: p.price }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Flash sales</h1>
        <p className="mt-1 text-sm text-white/50">
          Create time-boxed sales that discount chosen products by a percentage while
          active. The storefront shows the sale with a live countdown and enforces the
          price at checkout.
        </p>
      </div>
      <FlashSaleManager initialSales={sales} products={productLite} />
    </div>
  );
}
