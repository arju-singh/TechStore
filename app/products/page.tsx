import Link from "next/link";
import type { Metadata } from "next";
import {
  getProducts,
  getCategories,
  getCategoryCounts,
  PRICE_RANGES,
  type SortKey,
} from "@/lib/products";
import { getApprovedVendors } from "@/lib/vendors";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const [categories, vendors] = await Promise.all([
    getCategories(),
    getApprovedVendors(),
  ]);
  const cat = sp.category ? categories.find((c) => c.slug === sp.category) : undefined;
  const vend = sp.vendor ? vendors.find((v) => v.slug === sp.vendor) : undefined;

  // Only the clean category page is canonical + indexable. Free-text search and
  // price/bulk filter permutations are thin duplicates → noindex, and point
  // their canonical at the base category (or /products) to consolidate signals.
  const isFiltered =
    Boolean(sp.search) ||
    Boolean(sp.minPrice) ||
    Boolean(sp.maxPrice) ||
    sp.bulk === "1" ||
    Boolean(sp.vendor);

  const title = sp.search
    ? `Search: ${sp.search}`
    : vend
    ? vend.name
    : cat
    ? `${cat.name}`
    : "All products";

  const description = cat
    ? `Shop ${cat.name.toLowerCase()} at TechStore — ${cat.tagline}`
    : "Browse the full TechStore catalog — smartphones, laptops, audio, wearables and accessories.";

  const canonical = cat ? `/products?category=${cat.slug}` : "/products";

  return {
    title,
    description,
    alternates: { canonical },
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, url: canonical },
  };
}

type SearchParams = {
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  bulk?: string;
  vendor?: string;
};

interface Filters {
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  bulk?: boolean;
  vendor?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = sp.category;
  const search = sp.search;
  const sort = (sp.sort as SortKey) ?? "featured";
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const bulk = sp.bulk === "1";
  const vendor = sp.vendor;

  const [products, categories, counts, vendors] = await Promise.all([
    getProducts({ category, search, sort, minPrice, maxPrice, bulk, vendor }),
    getCategories(),
    getCategoryCounts(),
    getApprovedVendors(),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const activeVendor = vendors.find((v) => v.slug === vendor);
  const activeRange = PRICE_RANGES.find(
    (r) => r.minPrice === minPrice && r.maxPrice === maxPrice
  );
  const heading = search
    ? `Results for “${search}”`
    : activeVendor
    ? activeVendor.name
    : activeCategory
    ? activeCategory.name
    : "All products";

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const base: Filters = { category, search, sort, minPrice, maxPrice, bulk, vendor };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-amz-borderdark">
            {products.length} {products.length === 1 ? "result" : "results"}
            {activeRange ? ` · ${activeRange.label}` : ""}
            {bulk ? " · Bulk & wholesale" : ""}
          </p>
        </div>
        <SortSelect current={sort} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar filters */}
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-2 text-sm font-bold text-ink">Category</h2>
            <ul className="space-y-0.5">
              <FilterLink
                href={buildHref({ ...base, category: undefined })}
                label="All products"
                count={totalCount}
                active={!category}
              />
              {categories.map((c) => (
                <FilterLink
                  key={c.slug}
                  href={buildHref({ ...base, category: c.slug })}
                  label={c.name}
                  count={counts[c.slug] ?? 0}
                  active={category === c.slug}
                />
              ))}
            </ul>

            {vendors.length > 0 && (
              <>
                <h2 className="mb-2 mt-5 text-sm font-bold text-ink">Store</h2>
                <ul className="space-y-0.5">
                  <FilterLink
                    href={buildHref({ ...base, vendor: undefined })}
                    label="All stores"
                    active={!vendor}
                  />
                  {vendors.map((v) => (
                    <FilterLink
                      key={v.slug}
                      href={buildHref({ ...base, vendor: v.slug })}
                      label={v.name}
                      active={vendor === v.slug}
                    />
                  ))}
                </ul>
              </>
            )}

            <h2 className="mb-2 mt-5 text-sm font-bold text-ink">Price</h2>
            <ul className="space-y-0.5">
              <FilterLink
                href={buildHref({ ...base, minPrice: undefined, maxPrice: undefined })}
                label="Any price"
                active={!activeRange}
              />
              {PRICE_RANGES.map((r) => (
                <FilterLink
                  key={r.key}
                  href={buildHref({ ...base, minPrice: r.minPrice, maxPrice: r.maxPrice })}
                  label={r.label}
                  active={activeRange?.key === r.key}
                />
              ))}
            </ul>

            <h2 className="mb-2 mt-5 text-sm font-bold text-ink">Deals</h2>
            <Link
              href={buildHref({ ...base, bulk: !bulk })}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
                bulk
                  ? "font-bold text-blue-700"
                  : "text-amz-link hover:text-amz-linkH hover:underline"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  bulk ? "border-blue-600 bg-blue-600 text-white" : "border-white/15"
                }`}
              >
                {bulk && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={3}>
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              Bulk &amp; wholesale
            </Link>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <p className="text-lg font-bold text-ink">No products found</p>
              <p className="mt-1 text-sm text-amz-borderdark">
                Try a different filter or browse all products.
              </p>
              <Link href="/products" className="btn-primary mt-4">
                Browse all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildHref(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.category) sp.set("category", f.category);
  if (f.search) sp.set("search", f.search);
  if (f.sort && f.sort !== "featured") sp.set("sort", f.sort);
  if (typeof f.minPrice === "number") sp.set("minPrice", String(f.minPrice));
  if (typeof f.maxPrice === "number") sp.set("maxPrice", String(f.maxPrice));
  if (f.bulk) sp.set("bulk", "1");
  if (f.vendor) sp.set("vendor", f.vendor);
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

function FilterLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center justify-between rounded px-2 py-1.5 text-sm transition ${
          active
            ? "font-bold text-amz-linkH"
            : "text-amz-link hover:text-amz-linkH hover:underline"
        }`}
      >
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="text-xs text-amz-borderdark">{count}</span>
        )}
      </Link>
    </li>
  );
}
