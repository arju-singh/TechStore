import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import {
  getProductBySlug,
  updateProduct,
  deleteProduct,
} from "@/lib/products";
import { validateProduct } from "@/lib/validation";

/**
 * Ownership guard: a vendor may only ever touch a product that belongs to their
 * store. Returns the product when owned, or null (→ 404) otherwise — we don't
 * distinguish "not found" from "not yours" so a vendor can't probe the catalog.
 */
async function ownedProductOr404(slug: string, vendorSlug: string) {
  const product = await getProductBySlug(slug);
  if (!product || (product.vendorSlug ?? "") !== vendorSlug) return null;
  return product;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { slug } = await params;
  const existing = await ownedProductOr404(slug, ctx.vendor.slug);
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Slug identity comes from the URL; vendor attribution is re-forced so a vendor
  // can't reassign the product to (or away from) their store.
  const result = validateProduct({ ...body, slug });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const product = await updateProduct(slug, {
    ...result.product,
    vendorSlug: ctx.vendor.slug,
    vendorName: ctx.vendor.name,
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { slug } = await params;
  const existing = await ownedProductOr404(slug, ctx.vendor.slug);
  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const ok = await deleteProduct(slug);
  if (!ok) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
