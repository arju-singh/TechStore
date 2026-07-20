import { NextResponse } from "next/server";
import { getProductsBySlugs } from "@/lib/products";
import { withFlashPricing } from "@/lib/flashSales";

// Fresh catalog data for a set of slugs, in the requested order:
//   GET /api/products/by-slugs?slugs=iphone-13-pro,realme-xt
// Public; used by the "recently viewed" rail. Flash-sale pricing is applied so
// the rail shows the same live prices as the rest of the store.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const products = await withFlashPricing(await getProductsBySlugs(slugs));
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } }
  );
}
