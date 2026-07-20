/**
 * Client-safe flash-sale types + the pure status helper. NO database/mongoose
 * imports, so this is safe to import from client components. The server data
 * layer (lib/flashSales.ts) re-exports everything here.
 */

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
  /** Master on/off switch; a disabled sale never applies, even in its window. */
  enabled: boolean;
  items: FlashSaleItem[];
}

export interface FlashSaleInput {
  title: string;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
  items: FlashSaleItem[];
}

export type FlashSaleStatus = "active" | "scheduled" | "ended" | "disabled";

/** Lifecycle status of a sale relative to `now`. Pure — usable client or server. */
export function flashSaleStatus(sale: FlashSale, now = Date.now()): FlashSaleStatus {
  if (!sale.enabled) return "disabled";
  const start = Date.parse(sale.startsAt);
  const end = Date.parse(sale.endsAt);
  if (Number.isFinite(end) && now >= end) return "ended";
  if (Number.isFinite(start) && now < start) return "scheduled";
  return "active";
}
