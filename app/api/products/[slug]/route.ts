import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";

/** Public read-only product lookup by slug (used by client reorder / add-to-cart). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ product });
}
