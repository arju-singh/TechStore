import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { createProduct, getProductsByVendor } from "@/lib/products";
import { validateProduct } from "@/lib/validation";

/** Vendor: list only this store's products. */
export async function GET() {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const products = await getProductsByVendor(ctx.vendor.slug);
  return NextResponse.json({ products });
}

/**
 * Vendor: create a product in this store. The vendor attribution is forced
 * server-side from the session — a vendor can never list a product under another
 * store's name.
 */
export async function POST(request: Request) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateProduct(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    const product = await createProduct({
      ...result.product,
      vendorSlug: ctx.vendor.slug,
      vendorName: ctx.vendor.name,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create product." },
      { status: 409 }
    );
  }
}
