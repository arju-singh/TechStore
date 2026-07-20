/**
 * A public quantity break: any shopper who buys `minQty` or more of the product
 * pays `unitPrice` per unit instead of the retail `price`. Visible to everyone.
 */
export interface PriceTier {
  minQty: number;
  unitPrice: number;
}

/**
 * One quantity band of B2B wholesale pricing: buyers ordering between `minQty`
 * and `maxQty` (inclusive; `null` = open-ended) pay `unitPrice` per unit. Set by
 * the vendor per product, validated against the admin's max-discount cap.
 */
export interface WholesaleTier {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

/**
 * Approved-wholesaler pricing. Only surfaced to (and only applied for) users who
 * own an APPROVED wholesaler profile. `tiers` are the quantity bands (the modern
 * model); `unitPrice`/`moq` remain for the legacy single-rate contract price.
 */
export interface WholesaleConfig {
  enabled: boolean;
  unitPrice: number;
  moq: number;
  tiers?: WholesaleTier[];
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
  /**
   * Slug of the third-party vendor selling this product. "" (or absent) means
   * the item is sold directly by TechStore (a "house" product). This slug is the
   * stable link to a Vendor across the seed, in-memory, and Mongo data paths.
   */
  vendorSlug?: string;
  /** Denormalized vendor display name, for cheap "Sold by ⟨store⟩" rendering. */
  vendorName?: string;
  /**
   * Set only when an active flash sale covers this product (populated by
   * lib/flashSales `applyFlashSale`). When present, `price` has already been
   * overridden to `salePrice`; `originalPrice` is the pre-sale selling price and
   * `endsAt` drives the countdown. Absent when no sale is active.
   */
  flashSale?: {
    salePrice: number;
    originalPrice: number;
    /** ISO timestamp when the sale ends. */
    endsAt: string;
  };
}

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  image: string;
}

/** Lifecycle of a marketplace vendor, governed by an admin. */
export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export interface VendorAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

/**
 * A marketplace vendor (third-party seller). Plain shape shared by the data
 * layer, seed, and UI. There are no secrets on a vendor, so this is also the
 * public shape sent to clients.
 */
export interface Vendor {
  id: string;
  slug: string;
  name: string;
  /** The user who owns/operates this store. */
  ownerUserId: string;
  email: string;
  phone: string;
  description: string;
  logo: string;
  status: VendorStatus;
  /** Commission % override; null → platform default (PLATFORM_COMMISSION_RATE). */
  commissionRate: number | null;
  gstin: string;
  address: VendorAddress;
  policies: string;
  createdAt: string;
}
