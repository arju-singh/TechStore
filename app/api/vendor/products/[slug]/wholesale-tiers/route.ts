import { NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import { getProductBySlug, updateProduct } from "@/lib/products";
import { getWholesaleSettings } from "@/lib/wholesaleSettings";
import type { WholesaleTier } from "@/lib/types";

const DB_REQUIRED = "Wholesale requires a database. Set MONGODB_URI.";

async function ownedProductOr404(slug: string, vendorSlug: string) {
  const product = await getProductBySlug(slug);
  if (!product || (product.vendorSlug ?? "") !== vendorSlug) return null;
  return product;
}

/** Validate a wholesale tier table against the base price + admin discount cap. */
function validateTiers(
  raw: any,
  basePrice: number,
  maxDiscountPercent: number
): { tiers: WholesaleTier[]; moq: number } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Add at least one wholesale tier." };
  }
  const floor = basePrice * (1 - maxDiscountPercent / 100);
  const tiers: WholesaleTier[] = [];
  for (const r of raw) {
    const minQty = Number(r?.minQty);
    const maxQty = r?.maxQty === null || r?.maxQty === "" || r?.maxQty === undefined ? null : Number(r.maxQty);
    const unitPrice = Number(r?.unitPrice);
    if (!Number.isInteger(minQty) || minQty < 1) {
      return { error: "Each tier needs a whole minimum quantity of 1 or more." };
    }
    if (maxQty !== null && (!Number.isInteger(maxQty) || maxQty < minQty)) {
      return { error: "A tier's max quantity must be a whole number ≥ its min quantity." };
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { error: "Each tier needs a positive unit price." };
    }
    if (unitPrice > basePrice) {
      return { error: "A wholesale price can't exceed the retail price." };
    }
    if (unitPrice < floor - 0.001) {
      return {
        error: `Discount exceeds the platform cap of ${maxDiscountPercent}% (min allowed price ₹${floor.toFixed(2)}).`,
      };
    }
    tiers.push({ minQty, maxQty, unitPrice });
  }
  tiers.sort((a, b) => a.minQty - b.minQty);
  // Non-overlapping ascending ranges; higher-qty tiers priced ≤ lower ones.
  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1];
    const cur = tiers[i];
    if (prev.maxQty === null) {
      return { error: "Only the highest tier may be open-ended (blank max qty)." };
    }
    if (cur.minQty <= prev.maxQty) {
      return { error: "Wholesale tier quantity ranges must not overlap." };
    }
    if (cur.unitPrice > prev.unitPrice) {
      return { error: "Higher-quantity tiers must be priced at or below lower ones." };
    }
  }
  return { tiers, moq: tiers[0].minQty };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });
  const { slug } = await params;
  const product = await ownedProductOr404(slug, ctx.vendor.slug);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({
    wholesale: product.wholesale ?? { enabled: false, unitPrice: 0, moq: 1, tiers: [] },
    price: product.price,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ctx = await getVendorUser();
  if (!ctx) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (!hasDatabase) return NextResponse.json({ error: DB_REQUIRED }, { status: 503 });

  const { slug } = await params;
  const product = await ownedProductOr404(slug, ctx.vendor.slug);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const enabled = Boolean(body?.enabled);
  if (!enabled) {
    const updated = await updateProduct(slug, {
      wholesale: { enabled: false, unitPrice: 0, moq: 1, tiers: [] },
    });
    return NextResponse.json({ product: updated });
  }

  const settings = await getWholesaleSettings();
  const result = validateTiers(body?.tiers, product.price, settings.maxDiscountPercent);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Optional explicit MOQ overrides the lowest tier's minQty (but can't go below it).
  const moqRaw = Number(body?.moq);
  const moq = Number.isInteger(moqRaw) && moqRaw >= result.moq ? moqRaw : result.moq;

  const updated = await updateProduct(slug, {
    wholesale: {
      enabled: true,
      unitPrice: result.tiers[result.tiers.length - 1].unitPrice, // best rate, for display fallback
      moq,
      tiers: result.tiers,
    },
  });
  return NextResponse.json({ product: updated });
}
