import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import {
  getFeaturedProducts,
  getProducts,
  getProductsBySlugs,
  getCategories,
  getCategoryCounts,
  PRICE_RANGES,
} from "@/lib/products";
import {
  getActiveFlashSale,
  getFlashPriceMap,
  applyFlashToProducts,
} from "@/lib/flashSales";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";
import FlashSaleSection from "@/components/FlashSaleSection";
import RecentlyViewed from "@/components/RecentlyViewed";
import Reveal from "@/components/Reveal";

export default async function HomePage() {
  const [flashMap, sale, featuredRaw, dealsRaw, categories, counts, onTheGoRaw, budgetRaw, premiumRaw] =
    await Promise.all([
      getFlashPriceMap(),
      getActiveFlashSale(),
      getFeaturedProducts(10),
      getProducts({ sort: "discount" }),
      getCategories(),
      getCategoryCounts(),
      getProducts({ category: "audio", sort: "rating" }),
      getProducts({ maxPrice: 10000, sort: "discount" }),
      getProducts({ minPrice: 50000, sort: "rating" }),
    ]);

  // Apply active flash-sale pricing consistently across every rail.
  const apply = (list: Product[]) => applyFlashToProducts(list, flashMap);
  const featured = apply(featuredRaw);
  const onTheGo = apply(onTheGoRaw);
  const budget = apply(budgetRaw);
  const premium = apply(premiumRaw);
  const topDeals = apply(dealsRaw).slice(0, 6);
  const flashProducts = sale
    ? apply(await getProductsBySlugs(sale.items.map((i) => i.slug)))
    : [];

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1500px] px-6 pb-16 pt-20 sm:pt-28">
          <p className="animate-fade-in text-sm font-medium uppercase tracking-[0.2em] text-brand-400">
            Great Indian Tech Fest
          </p>
          <h1 className="mt-4 max-w-3xl animate-fade-up font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
            The tech you want,
            <br />
            <span className="text-white/40">at prices that move.</span>
          </h1>
          <p className="mt-5 max-w-xl animate-fade-up text-base text-white/60 [animation-delay:80ms]">
            Real phones, laptops, audio and wearables — free delivery over ₹499,
            Cash on Delivery, and bulk pricing for businesses.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:160ms]">
            <Link href="/products" className="btn-primary">
              Shop all products →
            </Link>
            <Link href="/become-a-wholesaler" className="btn-ghost">
              Buy wholesale
            </Link>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <Reveal className="mx-auto max-w-[1500px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/25"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white">
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width:768px) 45vw, 220px"
                  className="object-contain p-3 transition duration-500 group-hover:scale-105"
                />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-white">{c.name}</h2>
              <span className="text-xs text-white/40">{counts[c.slug] ?? 0} items</span>
            </Link>
          ))}
        </div>
      </Reveal>

      <div className="mx-auto max-w-[1500px] space-y-14 px-4 py-16 sm:px-6">
        {sale && flashProducts.length > 0 && (
          <Reveal>
            <FlashSaleSection title={sale.title} endsAt={sale.endsAt} products={flashProducts} />
          </Reveal>
        )}

        {topDeals.length > 0 && (
          <Reveal>
            <Rail title="Today's deals" href="/products?sort=discount" products={topDeals} />
          </Reveal>
        )}

        <Reveal>
          <ProductCarousel title="On-the-go essentials" href="/products?category=audio" products={onTheGo} />
        </Reveal>

        <Reveal>
          <ProductCarousel title="Under ₹10,000" href="/products?maxPrice=10000" products={budget} />
        </Reveal>

        <Reveal>
          <Rail title="Featured" href="/products" products={featured} />
        </Reveal>

        <Reveal>
          <ProductCarousel title="Premium flagships" href="/products?minPrice=50000" products={premium} />
        </Reveal>

        {/* Shop by price */}
        <Reveal>
          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white">Shop by budget</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PRICE_RANGES.map((r) => {
                const params = new URLSearchParams();
                if (r.minPrice) params.set("minPrice", String(r.minPrice));
                if (r.maxPrice) params.set("maxPrice", String(r.maxPrice));
                return (
                  <Link
                    key={r.key}
                    href={`/products?${params.toString()}`}
                    className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm font-semibold text-white/80 transition hover:-translate-y-1 hover:border-brand-400/40 hover:text-white"
                  >
                    {r.label}
                  </Link>
                );
              })}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <RecentlyViewed />
        </Reveal>
      </div>
    </div>
  );
}

function Rail({
  title,
  href,
  products,
}: {
  title: string;
  href: string;
  products: Awaited<ReturnType<typeof getProducts>>;
}) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <Link href={href} className="text-sm font-medium text-white/50 transition hover:text-white">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
