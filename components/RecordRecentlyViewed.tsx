"use client";

import { useEffect } from "react";
import { pushRecentlyViewed } from "@/lib/recentlyViewed";

/** Records the given product slug into the local "recently viewed" history on
 * mount. Renders nothing. Placed on the product detail page. */
export default function RecordRecentlyViewed({ slug }: { slug: string }) {
  useEffect(() => {
    pushRecentlyViewed(slug);
  }, [slug]);
  return null;
}
