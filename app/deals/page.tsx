import Link from "next/link";
import type { Metadata } from "next";
import { getActiveFlashSale, applyFlashToProducts, getFlashPriceMap } from "@/lib/flashSales";
import { getProductsBySlugs, getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import Countdown from "@/components/Countdown";

export const metadata: Metadata = {
  title: "Flash deals",
  description: "Limited-time flash sale prices on phones, laptops and more — while they last.",
  alternates: { canonical: "/deals" },
};

export default async function DealsPage() {
  const sale = await getActiveFlashSale();

  if (!sale) {
    // No live flash sale — fall back to the best standing discounts.
    const discounted = (await getProducts({ sort: "discount" })).slice(0, 12);
    return (
      <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Deals</h1>
        <p className="mt-2 text-sm text-white/50">
          No flash sale running right now — here are the biggest current discounts.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {discounted.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    );
  }

  const map = await getFlashPriceMap();
  const products = applyFlashToProducts(
    await getProductsBySlugs(sale.items.map((i) => i.slug)),
    map
  );

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.10] to-transparent p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-brand-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
              </svg>
              Flash sale
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {sale.title}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Prices drop for a limited time only. Grab them before the timer runs out.
            </p>
          </div>
          <div className="text-right">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">Ends in</p>
            <Countdown endsAt={sale.endsAt} />
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-white/50">
          These deals just sold out.{" "}
          <Link href="/products" className="text-brand-400 hover:underline">
            Browse all products
          </Link>
        </p>
      )}
    </div>
  );
}
