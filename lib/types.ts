/**
 * A public quantity break: any shopper who buys `minQty` or more of the product
 * pays `unitPrice` per unit instead of the retail `price`. Visible to everyone.
 */
export interface PriceTier {
  minQty: number;
  unitPrice: number;
}

/**
 * Approved-wholesaler contract pricing. Only surfaced to (and only applied for)
 * accounts whose wholesale application has been approved, and only when the line
 * quantity meets the minimum order quantity (`moq`).
 */
export interface WholesaleConfig {
  enabled: boolean;
  unitPrice: number;
  moq: number;
}

export interface Product {
  slug: string;
  name: string;
  brand: string;
  category: string; // category slug
  description: string;
  /** Maximum retail price (used to show the strikethrough / discount). */
  mrp: number;
  /** Actual selling price (retail, single unit). */
  price: number;
  image: string;
  rating: number;
  numReviews: number;
  stock: number;
  featured: boolean;
  specs: Record<string, string>;
  /** Public volume breaks, sorted ascending by minQty. Optional. */
  priceTiers?: PriceTier[];
  /** Approved-wholesaler-only pricing. Optional. */
  wholesale?: WholesaleConfig;
  /** GST rate (%) applied to this product. Prices are GST-inclusive. Default 18. */
  gstRate?: number;
}

/** Retail shopper vs approved wholesale buyer. */
export type AccountType = "retail" | "wholesale";

/** Lifecycle of a wholesale application. */
export type WholesaleStatus = "none" | "pending" | "approved" | "rejected";

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  image: string;
}
