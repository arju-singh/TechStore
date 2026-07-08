import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { updateProduct, deleteProduct } from "@/lib/products";
import { validateProduct } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { slug } = await params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Keep the slug from the URL as the identity; ignore any slug in the body.
  const result = validateProduct({ ...body, slug });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const product = await updateProduct(slug, result.product);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { slug } = await params;
  const ok = await deleteProduct(slug);
  if (!ok) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
