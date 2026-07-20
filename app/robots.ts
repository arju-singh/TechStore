import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawl policy. Public catalog is open to indexing; everything transactional or
 * account-scoped is disallowed so private surfaces and thin/duplicate parameter
 * pages stay out of the index. The sitemap is advertised for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/vendor",
          "/wholesale",
          "/account",
          "/cart",
          "/checkout",
          "/order",
          "/login",
          "/signup",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
