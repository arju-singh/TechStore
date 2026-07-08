import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { validateCoupon } from "@/lib/coupons";
import { getPricingContext } from "@/lib/auth";
import { unitPriceFor } from "@/lib/pricing";

/**
 * Preview a coupon against the cart. The client sends items ({slug, qty}); the
 * server resolves authoritative, buyer-aware prices and computes the subtotal
 * itself, so a client can't fake a qualifying subtotal (or a wholesale price).
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "Enter a coupon code." }, { status: 400 });
  }

  const ctx = await getPricingContext();
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  let subtotal = 0;
  for (const raw of rawItems) {
    const slug = typeof raw?.slug === "string" ? raw.slug : "";
    const qty = Number(raw?.qty);
    if (!slug || !Number.isInteger(qty) || qty < 1) continue;
    const product = await getProductBySlug(slug);
    if (product) subtotal += unitPriceFor(product, qty, ctx) * qty;
  }

  const result = await validateCoupon(code, subtotal);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
