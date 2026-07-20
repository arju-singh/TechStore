"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { getRecentlyViewed, clearRecentlyViewed } from "@/lib/recentlyViewed";
import ProductCard from "./ProductCard";

/**
 * "Recently viewed" rail. Reads slugs from localStorage on mount and fetches
 * fresh catalog data (so prices/stock/flash pricing are current). Renders
 * nothing when there's no history. `excludeSlug` drops the current product on a
 * PDP so it doesn't list itself.
 */
export default function RecentlyViewed({
  excludeSlug,
  title = "Recently viewed",
  limit = 6,
}: {
  excludeSlug?: string;
  title?: string;
  limit?: number;
}) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let slugs = getRecentlyViewed();
    if (excludeSlug) slugs = slugs.filter((s) => s !== excludeSlug);
    slugs = slugs.slice(0, limit);
    if (slugs.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/products/by-slugs?slugs=${slugs.map(encodeURIComponent).join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setProducts(Array.isArray(d.products) ? d.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [excludeSlug, limit]);

  if (!products || products.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <button
          type="button"
          onClick={() => {
            clearRecentlyViewed();
            setProducts([]);
          }}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
