import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  updateFlashSale,
  setFlashSaleEnabled,
  deleteFlashSale,
  getFlashSaleById,
  validateFlashItemSlugs,
  type FlashSaleInput,
} from "@/lib/flashSales";

/**
 * Update a flash sale. A body of just `{ enabled }` flips the toggle; a full
 * body replaces title/window/items.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const keys = Object.keys(body as object);
  // Toggle-only update.
  if (keys.length === 1 && keys[0] === "enabled") {
    const sale = await setFlashSaleEnabled(id, Boolean((body as { enabled: unknown }).enabled));
    if (!sale) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    return NextResponse.json({ sale });
  }

  const slugErr = await validateFlashItemSlugs((body as { items?: unknown })?.items);
  if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });

  try {
    const sale = await updateFlashSale(id, body as FlashSaleInput);
    if (!sale) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    return NextResponse.json({ sale });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update the sale." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const existing = await getFlashSaleById(id);
  if (!existing) return NextResponse.json({ error: "Sale not found." }, { status: 404 });

  await deleteFlashSale(id);
  return NextResponse.json({ ok: true });
}
