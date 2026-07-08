import "server-only";
import { getProductBySlug } from "@/lib/products";
import { unitPriceFor, computeTotals, type Totals } from "@/lib/pricing";
import { assertWholesaleEnabled } from "@/lib/wholesaleSettings";
import { membershipDiscountPercent } from "@/lib/membership";

/**
 * Server-authoritative wholesale pricing. The single place that turns a
 * (slug, qty) cart into priced lines + totals for a wholesaler — used by both
 * /api/wholesale/cart/calculate and /api/wholesale/orders, so the preview and
 * the charged price can never disagree. Client-sent prices are ignored entirely.
 * Throws specific errors ("MOQ not met", "not available for wholesale", …).
 */

const WHOLESALE_CTX = { isWholesaler: true } as const;

export interface WholesaleCartLine {
  slug: string;
  qty: number;
}

export interface WholesalePricedLine {
  slug: string;
  name: string;
  brand: string;
  image: string;
  qty: number;
  unitPrice: number;
  mrp: number;
  gstRate: number;
  vendorSlug: string;
  vendorName: string;
  commissionRate: number;
  stock: number;
}

export interface WholesaleCalc {
  lines: WholesalePricedLine[];
  totals: Totals;
}

export async function calculateWholesaleCart(
  entries: WholesaleCartLine[],
  membershipTier = "none"
): Promise<WholesaleCalc> {
  const settings = await assertWholesaleEnabled(); // throws if module disabled

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Your wholesale cart is empty.");
  }

  // Paid membership grants an extra platform discount on catalog prices.
  const memberDiscount = membershipDiscountPercent(membershipTier);

  const lines: WholesalePricedLine[] = [];
  for (const entry of entries) {
    const slug = typeof entry?.slug === "string" ? entry.slug : "";
    const qty = Number(entry?.qty);
    if (!slug || !Number.isInteger(qty) || qty < 1) {
      throw new Error("Invalid item in the wholesale cart.");
    }
    const product = await getProductBySlug(slug);
    if (!product) {
      throw new Error(`Product no longer available: ${slug}`);
    }
    if (!product.wholesale?.enabled) {
      throw new Error(`${product.name} is not available for wholesale.`);
    }
    const moq = product.wholesale.moq || 1;
    if (qty < moq) {
      throw new Error(
        `MOQ not met: ${product.name} requires at least ${moq} units (you have ${qty}).`
      );
    }
    // Authoritative unit price for a wholesaler at this quantity, then the
    // member's extra discount (a platform perk on top of the vendor's tier).
    const tierPrice = unitPriceFor(product, qty, WHOLESALE_CTX);
    const unitPrice =
      memberDiscount > 0
        ? Math.round(tierPrice * (1 - memberDiscount / 100))
        : tierPrice;
    lines.push({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.image,
      qty,
      unitPrice,
      mrp: product.mrp,
      gstRate: typeof product.gstRate === "number" ? product.gstRate : 18,
      vendorSlug: product.vendorSlug ?? "",
      vendorName: product.vendorName ?? "",
      // Wholesale orders use the platform's wholesale commission rate.
      commissionRate: settings.wholesaleCommissionPercent,
      stock: product.stock,
    });
  }

  const totals = computeTotals(
    lines.map((l) => ({ unitPrice: l.unitPrice, mrp: l.mrp, qty: l.qty }))
  );
  return { lines, totals };
}
