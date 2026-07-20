import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getProducts, getCategories } from "@/lib/products";
import { getApprovedVendors } from "@/lib/vendors";

// Generate at request time, not build time. The catalog is DB-backed and the
// rest of the app is force-dynamic for the same reason: opening a Mongo
// connection during `next build` can keep the build process from exiting.
export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap generated from the live catalog. Covers the public, indexable
 * surface only — product pages, category listings, and vendor storefronts —
 * plus the top-level marketing routes. Private/auth surfaces (admin, vendor,
 * wholesale, account, cart, checkout, order) are intentionally excluded here and
 * disallowed in robots.ts.
 *
 * Wrapped in try/catch so a transient DB hiccup degrades to the static routes
 * rather than 500-ing the whole sitemap (which would drop us from crawlers).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/deals`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/stores`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/become-a-wholesaler`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const [products, categories, vendors] = await Promise.all([
      getProducts(),
      getCategories(),
      getApprovedVendors(),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/products?category=${encodeURIComponent(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/product/${encodeURIComponent(p.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const storeRoutes: MetadataRoute.Sitemap = vendors.map((v) => ({
      url: `${SITE_URL}/store/${encodeURIComponent(v.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...storeRoutes];
  } catch {
    return staticRoutes;
  }
}
