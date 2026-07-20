import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import FlashSaleModel from "@/lib/models/FlashSale";
import { getProducts } from "@/lib/products";
import type { Product } from "@/lib/types";
import type {
  FlashSale,
  FlashSaleItem,
  FlashSaleInput,
  FlashSaleStatus,
} from "@/lib/flashSaleShared";

// Re-export the client-safe types + status helper so server callers can keep
// importing them from "@/lib/flashSales".
export type { FlashSale, FlashSaleItem, FlashSaleInput, FlashSaleStatus } from "@/lib/flashSaleShared";
export { flashSaleStatus } from "@/lib/flashSaleShared";

/** Per-slug flash discount + when the sale ends, for the currently-active sale. */
export type FlashPriceMap = Map<string, { discountPct: number; endsAt: string }>;

/*
 * In-memory demo sale for the no-database path. Seeded once with a window that is
 * active "now" (started an hour ago, ends a few hours out) so the storefront has
 * a live flash sale — and a ticking countdown — out of the box. Mirrors the seed
 * fallback used across the retail data layer.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memFlashSale: FlashSale | undefined;
}
function memFlashSale(): FlashSale {
  if (!global._memFlashSale) {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    global._memFlashSale = {
      id: "seed-flash-sale",
      title: "Lightning Deals",
      enabled: true,
      startsAt: new Date(now - HOUR).toISOString(),
      endsAt: new Date(now + 6 * HOUR).toISOString(),
      items: [
        { slug: "iphone-13-pro", discountPct: 20 },
        { slug: "samsung-galaxy-s10", discountPct: 30 },
        { slug: "realme-xt", discountPct: 25 },
        { slug: "dell-xps-13", discountPct: 15 },
        { slug: "asus-zenbook-pro-duo", discountPct: 22 },
        { slug: "lenovo-yoga-920", discountPct: 28 },
      ],
    };
  }
  return global._memFlashSale;
}

function toPlainSale(doc: any): FlashSale {
  return {
    id: String(doc._id ?? doc.id),
    title: doc.title,
    enabled: doc.enabled !== false,
    startsAt:
      doc.startsAt instanceof Date ? doc.startsAt.toISOString() : String(doc.startsAt),
    endsAt: doc.endsAt instanceof Date ? doc.endsAt.toISOString() : String(doc.endsAt),
    items: Array.isArray(doc.items)
      ? doc.items
          .map((i: any) => ({ slug: String(i.slug), discountPct: Number(i.discountPct) }))
          .filter((i: any) => i.slug && Number.isFinite(i.discountPct))
      : [],
  };
}

function isActive(sale: FlashSale, now = Date.now()): boolean {
  const start = Date.parse(sale.startsAt);
  const end = Date.parse(sale.endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
}

/** The flash sale currently in its active window, or null. */
export async function getActiveFlashSale(): Promise<FlashSale | null> {
  if (hasDatabase) {
    try {
      await connectToDatabase();
      const now = new Date();
      const doc = await FlashSaleModel.findOne({
        enabled: true,
        startsAt: { $lte: now },
        endsAt: { $gt: now },
      })
        .sort({ endsAt: 1 })
        .lean();
      if (doc) return toPlainSale(doc);
    } catch {
      // Fall through to the demo sale on any DB hiccup.
    }
  }
  // Demo fallback (and the no-database path): a live sale so the storefront
  // always showcases the feature out of the box. A real DB-configured sale
  // takes precedence over this.
  const sale = memFlashSale();
  return isActive(sale) ? sale : null;
}

/** A lookup of the active sale's discounts by product slug (empty if no sale). */
export async function getFlashPriceMap(): Promise<FlashPriceMap> {
  const sale = await getActiveFlashSale();
  const map: FlashPriceMap = new Map();
  if (!sale) return map;
  for (const item of sale.items) {
    if (item.discountPct > 0 && item.discountPct <= 90) {
      map.set(item.slug, { discountPct: item.discountPct, endsAt: sale.endsAt });
    }
  }
  return map;
}

/**
 * Return `product` with its flash-sale price applied when the sale covers it:
 * `price` is overridden to the discounted value and `flashSale` records the
 * original price + end time. Non-mutating. Products not in the sale pass through
 * unchanged. The salePrice is computed from the live price, so it's always a real
 * discount regardless of catalog changes.
 */
export function applyFlashSale(product: Product, map: FlashPriceMap): Product {
  const entry = map.get(product.slug);
  if (!entry) return product;
  const salePrice = Math.max(1, Math.round(product.price * (1 - entry.discountPct / 100)));
  if (salePrice >= product.price) return product; // never a markup
  return {
    ...product,
    price: salePrice,
    flashSale: {
      salePrice,
      originalPrice: product.price,
      endsAt: entry.endsAt,
    },
  };
}

/** Apply flash pricing across a list of products. */
export function applyFlashToProducts(products: Product[], map: FlashPriceMap): Product[] {
  if (map.size === 0) return products;
  return products.map((p) => applyFlashSale(p, map));
}

/** Convenience: load the active-sale map and apply it to a product list. */
export async function withFlashPricing(products: Product[]): Promise<Product[]> {
  const map = await getFlashPriceMap();
  return applyFlashToProducts(products, map);
}

// ---------------------------------------------------------------------------
// Admin management (DB-backed). The in-memory demo sale is a read-only fallback
// for the storefront; admin CRUD operates on real database records, which take
// precedence over the demo once one is active.
// ---------------------------------------------------------------------------

function requireDb() {
  if (!hasDatabase) {
    throw new Error("Flash-sale management requires a database (set MONGODB_URI).");
  }
}

/** Reject item slugs that don't reference a real product. Error string, or null. */
export async function validateFlashItemSlugs(items: unknown): Promise<string | null> {
  if (!Array.isArray(items)) return null;
  const valid = new Set((await getProducts()).map((p) => p.slug));
  for (const it of items) {
    const slug = String((it as { slug?: unknown })?.slug ?? "").trim();
    if (slug && !valid.has(slug)) return `Unknown product: ${slug}.`;
  }
  return null;
}

/** All flash sales, newest first — for the admin screen (DB only). */
export async function getAllFlashSales(): Promise<FlashSale[]> {
  if (!hasDatabase) return [];
  await connectToDatabase();
  const docs = await FlashSaleModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(toPlainSale);
}

export async function getFlashSaleById(id: string): Promise<FlashSale | null> {
  if (!hasDatabase) return null;
  await connectToDatabase();
  const doc = await FlashSaleModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? toPlainSale(doc) : null;
}

/** Validate + normalize sale input. Returns clean fields or throws a clear error. */
function normalizeInput(input: FlashSaleInput): {
  title: string;
  startsAt: Date;
  endsAt: Date;
  enabled: boolean;
  items: FlashSaleItem[];
} {
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Start and end must be valid dates.");
  }
  if (endsAt <= startsAt) throw new Error("End time must be after the start time.");

  const items: FlashSaleItem[] = Array.isArray(input.items) ? input.items : [];
  const seen = new Set<string>();
  const clean: FlashSaleItem[] = [];
  for (const it of items) {
    const slug = String(it?.slug ?? "").trim();
    const pct = Math.round(Number(it?.discountPct));
    if (!slug) continue;
    if (!Number.isFinite(pct) || pct < 1 || pct > 90) {
      throw new Error(`Discount for "${slug}" must be between 1 and 90%.`);
    }
    if (seen.has(slug)) throw new Error(`Duplicate product in the sale: ${slug}.`);
    seen.add(slug);
    clean.push({ slug, discountPct: pct });
  }

  return { title, startsAt, endsAt, enabled: Boolean(input.enabled), items: clean };
}

export async function createFlashSale(input: FlashSaleInput): Promise<FlashSale> {
  requireDb();
  await connectToDatabase();
  const data = normalizeInput(input);
  const doc = await FlashSaleModel.create(data);
  return toPlainSale(doc.toObject());
}

export async function updateFlashSale(
  id: string,
  input: FlashSaleInput
): Promise<FlashSale | null> {
  requireDb();
  await connectToDatabase();
  const data = normalizeInput(input);
  const doc = await FlashSaleModel.findByIdAndUpdate(id, data, { new: true }).lean();
  return doc ? toPlainSale(doc) : null;
}

/** Flip just the enabled flag (used by the row toggle). */
export async function setFlashSaleEnabled(
  id: string,
  enabled: boolean
): Promise<FlashSale | null> {
  requireDb();
  await connectToDatabase();
  const doc = await FlashSaleModel.findByIdAndUpdate(id, { enabled }, { new: true }).lean();
  return doc ? toPlainSale(doc) : null;
}

export async function deleteFlashSale(id: string): Promise<boolean> {
  requireDb();
  await connectToDatabase();
  const res = await FlashSaleModel.deleteOne({ _id: id });
  return res.deletedCount > 0;
}
