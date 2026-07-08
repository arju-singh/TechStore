import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getProductBySlug, updateProduct } from "@/lib/products";
import { validatePricing } from "@/lib/validation";

/**
 * Update ONLY the pricing fields (volume tiers, wholesale config, GST rate) of a
 * product. Powers the admin bulk-pricing editor, which edits many products'
 * pricing without touching the rest of each product. Tiers/wholesale are bounded
 * against the product's authoritative base price, resolved server-side.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validatePricing(body, product.price);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await updateProduct(slug, result.pricing);
  if (!updated) {
    return NextResponse.json({ error: "Could not update pricing." }, { status: 500 });
  }
  return NextResponse.json({ product: updated });
}
