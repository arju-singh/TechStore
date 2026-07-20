import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import FlashSaleModel from "@/lib/models/FlashSale";
import type { Product } from "@/lib/types";

export interface FlashSaleItem {
  slug: string;
  /** Percentage off the product's current selling price (1–90). */
  discountPct: number;
}

export interface FlashSale {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  items: FlashSaleItem[];
}

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
