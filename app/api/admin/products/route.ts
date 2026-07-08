import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createProduct, getProducts } from "@/lib/products";
import { validateProduct } from "@/lib/validation";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const products = await getProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

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
    const product = await createProduct(result.product);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create product." },
      { status: 409 }
    );
  }
}
