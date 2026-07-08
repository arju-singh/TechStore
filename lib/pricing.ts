/**
 * Single source of truth for cart/order money math, shared by the client cart
 * (lib/cart.tsx) and the server order pipeline (app/api/orders) so totals can
 * never disagree between what the shopper sees and what the server charges.
 *
 * Dual retail + wholesale pricing lives here too: `unitPriceFor` resolves the
 * effective per-unit price from (product, quantity, buyer context). The client
 * may call it for display, but the server ALWAYS recomputes it from the catalog
 * and the session-derived wholesaler status — the client can never set a price,
 * its own MOQ, or claim to be a wholesaler.
 */

import type { PriceTier, Product, WholesaleConfig } from "@/lib/types";

export const FREE_DELIVERY_THRESHOLD = 499;
export const DELIVERY_FEE = 49;
export const DEFAULT_GST_RATE = 18;

/**
 * Split a GST-INCLUSIVE amount into its taxable value and tax components. Indian
 * retail prices are quoted inclusive of GST, so the tax is extracted (not added).
 * Intra-state is assumed, so the tax splits evenly into CGST + SGST.
 */
export function gstBreakup(inclusiveAmount: number, rate: number) {
  const r = rate > 0 ? rate : 0;
  const taxable = inclusiveAmount / (1 + r / 100);
  const tax = inclusiveAmount - taxable;
  return {
    rate: r,
    taxable,
    tax,
    cgst: tax / 2,
    sgst: tax / 2,
  };
}

/** Whether the buyer is an approved wholesaler. Derived server-side from session. */
export interface PricingContext {
  isWholesaler: boolean;
}

export const RETAIL_CONTEXT: PricingContext = { isWholesaler: false };

/** The pricing-relevant subset of a product. Keeps callers decoupled from the full type. */
export interface Priceable {
  price: number;
  mrp: number;
  priceTiers?: PriceTier[];
  wholesale?: WholesaleConfig;
}

export interface PricedLine {
  /** Resolved effective per-unit price for this line's quantity + buyer. */
  unitPrice: number;
  mrp: number;
  qty: number;
}

export interface Totals {
  count: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  couponDiscount: number;
  deliveryFee: number;
  grandTotal: number;
}

/** Percentage discount of price vs MRP. Client-safe (no DB imports). */
export function discountPercent(p: { mrp: number; price: number }): number {
  if (!p.mrp || p.mrp <= p.price) return 0;
  return Math.round(((p.mrp - p.price) / p.mrp) * 100);
}

/**
 * Effective per-unit price for a given quantity and buyer context — the lowest
 * of: retail price, any public volume break the quantity qualifies for, and (for
 * approved wholesalers meeting the MOQ) the wholesale contract price. Monotonic:
 * buying more never costs more per unit.
 */
export function unitPriceFor(
  p: Priceable,
  qty: number,
  ctx: PricingContext = RETAIL_CONTEXT
): number {
  const candidates = [p.price];
  for (const tier of p.priceTiers ?? []) {
    if (qty >= tier.minQty) candidates.push(tier.unitPrice);
  }
  if (ctx.isWholesaler && p.wholesale?.enabled) {
    const tiers = p.wholesale.tiers ?? [];
    if (tiers.length > 0) {
      // Quantity bands: the wholesale rate applies only within a band's range.
      for (const t of tiers) {
        const within = qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty);
        if (within) candidates.push(t.unitPrice);
      }
    } else if (p.wholesale.unitPrice > 0) {
      // Legacy single contract rate (MOQ enforced separately at checkout).
      candidates.push(p.wholesale.unitPrice);
    }
  }
  return Math.min(...candidates);
}

/**
 * Minimum-order-quantity check. When an approved wholesaler is getting the
 * wholesale contract price on a line, they must order at least the product's
 * MOQ. Returns a human-readable error string, or null when the line is fine.
 * Retail buyers (and lines not priced at wholesale) are never blocked.
 */
export function moqError(
  p: Priceable,
  qty: number,
  ctx: PricingContext,
  name = "this item"
): string | null {
  if (!ctx.isWholesaler || !p.wholesale?.enabled) return null;
  // Tier-based products self-gate: a band's rate only applies within its qty
  // range, so there's nothing extra to enforce in the shared engine. The
  // dedicated wholesale checkout enforces the product MOQ explicitly.
  if ((p.wholesale.tiers?.length ?? 0) > 0) return null;
  // Legacy single wholesale rate: enforce MOQ when the buyer benefits from it.
  const usingWholesalePrice = unitPriceFor(p, qty, ctx) === p.wholesale.unitPrice;
  if (usingWholesalePrice && qty < p.wholesale.moq) {
    return `${name}: minimum wholesale order is ${p.wholesale.moq} units (you have ${qty}).`;
  }
  return null;
}

/** The best price a buyer in this context could ever reach for the product (at any qty). */
export function bestPriceFor(p: Priceable, ctx: PricingContext): number {
  const candidates = [p.price];
  for (const tier of p.priceTiers ?? []) candidates.push(tier.unitPrice);
  if (ctx.isWholesaler && p.wholesale?.enabled) {
    const tiers = p.wholesale.tiers ?? [];
    if (tiers.length > 0) for (const t of tiers) candidates.push(t.unitPrice);
    else if (p.wholesale.unitPrice > 0) candidates.push(p.wholesale.unitPrice);
  }
  return Math.min(...candidates);
}

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function computeTotals(
  lines: PricedLine[],
  couponDiscount = 0
): Totals {
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const deliveryFee = deliveryFeeFor(subtotal);
  // Delivery threshold is based on subtotal (pre-coupon). Coupon reduces the
  // grand total but can't push it below the delivery fee.
  const discount = Math.max(0, Math.min(couponDiscount, subtotal));
  return {
    count,
    subtotal,
    mrpTotal,
    savings: mrpTotal - subtotal,
    couponDiscount: discount,
    deliveryFee,
    grandTotal: subtotal + deliveryFee - discount,
  };
}

/**
 * Convenience: price a set of catalog products + quantities for a buyer context
 * into PricedLines. Used by both the client cart (display) and the server order
 * pipeline (authoritative), so the math is identical on both sides.
 */
export function priceLines(
  entries: { product: Priceable; qty: number }[],
  ctx: PricingContext = RETAIL_CONTEXT
): PricedLine[] {
  return entries.map(({ product, qty }) => ({
    unitPrice: unitPriceFor(product, qty, ctx),
    mrp: product.mrp,
    qty,
  }));
}
