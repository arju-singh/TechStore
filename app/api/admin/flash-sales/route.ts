import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  getAllFlashSales,
  createFlashSale,
  validateFlashItemSlugs,
  type FlashSaleInput,
} from "@/lib/flashSales";

/** All flash sales for the admin management screen. */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const sales = await getAllFlashSales();
  return NextResponse.json({ sales });
}

/** Create a flash sale. */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slugErr = await validateFlashItemSlugs((body as { items?: unknown })?.items);
  if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });

  try {
    const sale = await createFlashSale(body as FlashSaleInput);
    return NextResponse.json({ sale }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create the sale." },
      { status: 400 }
    );
  }
}
