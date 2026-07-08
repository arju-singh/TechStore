import Image from "next/image";
import Link from "next/link";
import {
  getFeaturedProducts,
  getProducts,
  getCategories,
  getCategoryCounts,
  PRICE_RANGES,
} from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";

export default async function HomePage() {
  const [featured, deals, categories, counts, onTheGo, budget, premium] =
    await Promise.all([
      getFeaturedProducts(8),
      getProducts({ sort: "discount" }),
      getCategories(),
      getCategoryCounts(),
      getProducts({ category: "audio", sort: "rating" }),
      getProducts({ maxPrice: 10000, sort: "discount" }),
      getProducts({ minPrice: 50000, sort: "rating" }),
    ]);
  const topDeals = deals.slice(0, 6);

  return (
    <div className="relative">
      {/* Hero banner */}
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-b from-amz-navy2 to-amz-bg sm:h-80">
        <div className="mx-auto flex h-full max-w-[1500px] flex-col justify-center px-6">
          <p className="text-sm font-medium text-amz-search">Great Indian Tech Fest</p>
          <h1 className="mt-1 max-w-xl font-display text-3xl font-bold text-white sm:text-4xl">
            Big savings on phones, laptops &amp; audio
          </h1>
          <p className="mt-2 max-w-md text-white/80">
            Free delivery over ₹499 · Cash on Delivery available across India.
          </p>
          <div className="mt-5">
            <Link href="/products" className="btn-primary">
              Shop all deals
            </Link>
          </div>
        </div>
      </div>

      {/* Category cards overlapping the banner */}
      <div className="relative z-10 mx-auto -mt-24 max-w-[1500px] px-3 sm:px-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="group flex flex-col rounded-lg bg-white p-4 shadow-soft transition hover:shadow-amz"
            >
              <h2 className="text-base font-bold text-ink">{c.name}</h2>
              <div className="relative mt-2 aspect-square w-full overflow-hidden rounded">
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width:768px) 45vw, 220px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <span className="mt-3 text-sm font-medium text-amz-link group-hover:text-amz-linkH group-hover:underline">
                Shop {counts[c.slug] ?? 0} items
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[1500px] space-y-4 px-3 py-4 sm:px-4">
        {/* Shop by price */}
        <section className="rounded-lg bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-xl font-bold text-ink">Shop by price</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRICE_RANGES.map((r) => {
              const params = new URLSearchParams();
              if (r.minPrice) params.set("minPrice", String(r.minPrice));
              if (r.maxPrice) params.set("maxPrice", String(r.maxPrice));
              return (
                <Link
                  key={r.key}
                  href={`/products?${params.toString()}`}
                  className="flex items-center justify-center rounded-lg border border-amz-border bg-gradient-to-b from-white to-amz-bg px-4 py-6 text-center text-base font-bold text-ink transition hover:border-amz-orange hover:shadow-amz"
                >
                  {r.label}
                </Link>
              );
            })}
          </div>
        </section>

        {topDeals.length > 0 && (
          <Rail title="Today's Deals" href="/products?sort=discount" products={topDeals} />
        )}

        <ProductCarousel
          title="On-the-go essentials"
          href="/products?category=audio"
          products={onTheGo}
        />

        <ProductCarousel
          title="Budget buys under ₹10,000"
          href="/products?maxPrice=10000"
          products={budget}
        />

        <Rail title="Featured products" href="/products" products={featured} />

        <ProductCarousel
          title="Premium flagships"
          href="/products?minPrice=50000"
          products={premium}
        />
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
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <Link
          href={href}
          className="text-sm font-medium text-amz-link hover:text-amz-linkH hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
