export interface Validated {
  name: string;
  email: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export function validateName(name: unknown): string | null {
  if (typeof name !== "string" || name.trim().length < 2) {
    return "Please enter your name (at least 2 characters).";
  }
  return null;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const PHONE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile
const PINCODE_RE = /^[1-9]\d{5}$/; // Indian 6-digit pincode
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PriceTierInput {
  minQty: number;
  unitPrice: number;
}

export interface WholesaleInput {
  enabled: boolean;
  unitPrice: number;
  moq: number;
}

export interface ProductInput {
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  mrp: number;
  price: number;
  image: string;
  stock: number;
  featured: boolean;
  rating: number;
  numReviews: number;
  specs: Record<string, string>;
  priceTiers: PriceTierInput[];
  wholesale: WholesaleInput;
  gstRate: number;
}

/** Snap a GST rate to the nearest legal Indian slab; default 18%. */
export function normalizeGstRate(raw: unknown): number {
  const SLABS = [0, 5, 12, 18, 28];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 18;
  return SLABS.reduce(
    (best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best),
    18
  );
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate/normalize an admin product payload. */
export function validateProduct(
  raw: any
): { product: ProductInput } | { error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

  const name = str(raw?.name);
  if (name.length < 2) return { error: "Please enter a product name." };

  let slug = str(raw?.slug) || slugify(name);
  slug = slugify(slug);
  if (!SLUG_RE.test(slug)) return { error: "Invalid slug (use lowercase letters, numbers, hyphens)." };

  const brand = str(raw?.brand);
  if (brand.length < 1) return { error: "Please enter a brand." };

  const category = str(raw?.category);
  if (category.length < 1) return { error: "Please choose a category." };

  const mrp = num(raw?.mrp);
  const price = num(raw?.price);
  if (!Number.isFinite(mrp) || mrp <= 0) return { error: "MRP must be a positive number." };
  if (!Number.isFinite(price) || price <= 0) return { error: "Price must be a positive number." };
  if (price > mrp) return { error: "Selling price cannot exceed MRP." };

  const stock = num(raw?.stock);
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a non-negative whole number." };

  const image = str(raw?.image);
  if (!/^https?:\/\//.test(image)) return { error: "Image must be a valid http(s) URL." };

  // specs: accept an object, or a "Key: Value" per-line string.
  let specs: Record<string, string> = {};
  if (raw?.specs && typeof raw.specs === "object" && !Array.isArray(raw.specs)) {
    for (const [k, v] of Object.entries(raw.specs)) {
      if (str(k)) specs[str(k)] = str(v);
    }
  } else if (typeof raw?.specs === "string") {
    for (const line of raw.specs.split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k) specs[k] = v;
      }
    }
  }

  const rating = num(raw?.rating);
  const numReviews = num(raw?.numReviews);

  // Public volume breaks. Accept an array of {minQty, unitPrice}, or a
  // "minQty: unitPrice" per-line string from the admin form.
  const tiersResult = parsePriceTiers(raw?.priceTiers, price);
  if ("error" in tiersResult) return { error: tiersResult.error };
  const priceTiers = tiersResult.tiers;

  // Approved-wholesaler pricing.
  const wholesaleResult = parseWholesale(raw?.wholesale, price);
  if ("error" in wholesaleResult) return { error: wholesaleResult.error };
  const wholesale = wholesaleResult.wholesale;

  return {
    product: {
      slug,
      name,
      brand,
      category,
      description: str(raw?.description),
      mrp,
      price,
      image,
      stock,
      featured: Boolean(raw?.featured),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      numReviews: Number.isInteger(numReviews) && numReviews >= 0 ? numReviews : 0,
      specs,
      priceTiers,
      wholesale,
      gstRate: raw?.gstRate === undefined ? 18 : normalizeGstRate(raw.gstRate),
    },
  };
}

/**
 * Validate a pricing-only payload (used by the admin bulk-pricing editor). Needs
 * the product's authoritative base price to bound tiers/wholesale against.
 */
export function validatePricing(
  raw: any,
  basePrice: number
):
  | { pricing: { priceTiers: PriceTierInput[]; wholesale: WholesaleInput; gstRate: number } }
  | { error: string } {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return { error: "Product base price is invalid." };
  }
  const tiersResult = parsePriceTiers(raw?.priceTiers, basePrice);
  if ("error" in tiersResult) return { error: tiersResult.error };
  const wholesaleResult = parseWholesale(raw?.wholesale, basePrice);
  if ("error" in wholesaleResult) return { error: wholesaleResult.error };
  return {
    pricing: {
      priceTiers: tiersResult.tiers,
      wholesale: wholesaleResult.wholesale,
      gstRate: raw?.gstRate === undefined ? 18 : normalizeGstRate(raw.gstRate),
    },
  };
}

/** Parse + validate public volume breaks. Enforces monotonic, valid tiers. */
function parsePriceTiers(
  raw: unknown,
  price: number
): { tiers: PriceTierInput[] } | { error: string } {
  const rows: { minQty: number; unitPrice: number }[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw) {
      rows.push({ minQty: Number((r as any)?.minQty), unitPrice: Number((r as any)?.unitPrice) });
    }
  } else if (typeof raw === "string") {
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      const i = t.indexOf(":");
      if (i <= 0) continue;
      rows.push({ minQty: Number(t.slice(0, i)), unitPrice: Number(t.slice(i + 1)) });
    }
  }
  const tiers: PriceTierInput[] = [];
  for (const r of rows) {
    if (!Number.isInteger(r.minQty) || r.minQty < 2) {
      return { error: "Each volume tier needs a whole minimum quantity of 2 or more." };
    }
    if (!Number.isFinite(r.unitPrice) || r.unitPrice <= 0) {
      return { error: "Each volume tier needs a positive unit price." };
    }
    if (r.unitPrice > price) {
      return { error: "A volume tier price can't exceed the base selling price." };
    }
    tiers.push({ minQty: r.minQty, unitPrice: r.unitPrice });
  }
  tiers.sort((a, b) => a.minQty - b.minQty);
  // Monotonic: a higher minimum quantity must not cost more per unit.
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minQty === tiers[i - 1].minQty) {
      return { error: "Volume tiers must have distinct minimum quantities." };
    }
    if (tiers[i].unitPrice > tiers[i - 1].unitPrice) {
      return { error: "Higher-quantity tiers must be priced at or below lower-quantity tiers." };
    }
  }
  return { tiers };
}

/** Parse + validate approved-wholesaler pricing. Disabled → zeroed config. */
function parseWholesale(
  raw: unknown,
  price: number
): { wholesale: WholesaleInput } | { error: string } {
  const w = (raw ?? {}) as any;
  const enabled = Boolean(w.enabled);
  if (!enabled) return { wholesale: { enabled: false, unitPrice: 0, moq: 1 } };
  const unitPrice = Number(w.unitPrice);
  const moq = Number(w.moq);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "Wholesale price must be a positive number." };
  }
  if (unitPrice > price) {
    return { error: "Wholesale price can't exceed the base selling price." };
  }
  if (!Number.isInteger(moq) || moq < 1) {
    return { error: "Wholesale minimum order quantity must be a whole number of 1 or more." };
  }
  return { wholesale: { enabled: true, unitPrice, moq } };
}

/** Validate a wholesale application's business details. */
export interface BusinessInput {
  companyName: string;
  gstin: string;
  businessPhone: string;
}
export function validateBusiness(
  raw: any
): { business: BusinessInput } | { error: string } {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const companyName = s(raw?.companyName);
  const gstin = s(raw?.gstin);
  const businessPhone = s(raw?.businessPhone);
  if (companyName.length < 2) {
    return { error: "Please enter your business / company name." };
  }
  if (!PHONE_RE.test(businessPhone)) {
    return { error: "Please enter a valid 10-digit business phone number." };
  }
  // GSTIN is optional and free-text (no GST logic), but if provided sanity-check length.
  if (gstin && (gstin.length < 5 || gstin.length > 20)) {
    return { error: "Please enter a valid GSTIN, or leave it blank." };
  }
  return { business: { companyName, gstin, businessPhone } };
}

/** Validate a shipping address. Returns a cleaned address or an error message. */
export function validateAddress(
  raw: any
): { address: AddressInput } | { error: string } {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const address: AddressInput = {
    fullName: s(raw?.fullName),
    phone: s(raw?.phone),
    line1: s(raw?.line1),
    line2: s(raw?.line2),
    city: s(raw?.city),
    state: s(raw?.state),
    pincode: s(raw?.pincode),
  };

  if (address.fullName.length < 2) return { error: "Please enter the recipient's full name." };
  if (!PHONE_RE.test(address.phone))
    return { error: "Please enter a valid 10-digit mobile number." };
  if (address.line1.length < 4) return { error: "Please enter the address (house / street)." };
  if (address.city.length < 2) return { error: "Please enter the city." };
  if (address.state.length < 2) return { error: "Please enter the state." };
  if (!PINCODE_RE.test(address.pincode))
    return { error: "Please enter a valid 6-digit pincode." };

  return { address };
}

// Indian GSTIN: 15 chars — 2-digit state code, 10-char PAN, entity digit, 'Z',
// checksum. Applications with a malformed tax number are rejected immediately.
const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const WHOLESALE_BUSINESS_TYPES = [
  "pet_shop",
  "distributor",
  "breeder",
  "veterinary_clinic",
  "ngo",
  "supermarket",
  "wholesaler",
  "retail_shop",
  "importer",
  "exporter",
  "other",
] as const;
export type WholesaleBusinessType = (typeof WHOLESALE_BUSINESS_TYPES)[number];

export interface WholesaleAddressInput {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface WholesalerApplicationInput {
  businessName: string;
  ownerName: string;
  taxNumber: string;
  tradeLicenseNumber: string;
  businessType: WholesaleBusinessType;
  email: string;
  phone: string;
  website: string;
  expectedMonthlyPurchase: number;
  categoriesInterested: string[];
  businessAddress: WholesaleAddressInput;
  warehouseAddress: WholesaleAddressInput;
}

/** Validate/normalize a wholesaler registration. Fails loud on bad input. */
export function validateWholesalerApplication(
  raw: any
): { application: WholesalerApplicationInput } | { error: string } {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const businessName = s(raw?.businessName);
  if (businessName.length < 2)
    return { error: "Please enter your business name." };

  const ownerName = s(raw?.ownerName);
  if (ownerName.length < 2)
    return { error: "Please enter the owner's full name." };

  const taxNumber = s(raw?.taxNumber).toUpperCase();
  if (!GSTIN_RE.test(taxNumber))
    return { error: "Tax number invalid: enter a valid 15-character GSTIN." };

  const businessType = s(raw?.businessType);
  if (!WHOLESALE_BUSINESS_TYPES.includes(businessType as WholesaleBusinessType))
    return { error: "Please choose a valid business type." };

  const email = s(raw?.email);
  if (validateEmail(email))
    return { error: "Please enter a valid business email address." };

  const phone = s(raw?.phone);
  if (!PHONE_RE.test(phone))
    return { error: "Please enter a valid 10-digit business phone number." };

  const addr = (a: any): WholesaleAddressInput => ({
    line1: s(a?.line1),
    line2: s(a?.line2),
    city: s(a?.city),
    state: s(a?.state),
    pincode: s(a?.pincode),
    country: s(a?.country) || "India",
  });
  const businessAddress = addr(raw?.businessAddress);
  if (
    businessAddress.line1.length < 4 ||
    businessAddress.city.length < 2 ||
    !PINCODE_RE.test(businessAddress.pincode)
  )
    return {
      error: "Please enter a complete business address with a valid pincode.",
    };
  const warehouseAddress = addr(raw?.warehouseAddress);

  const expectedMonthlyPurchase = Number(raw?.expectedMonthlyPurchase);
  const categoriesInterested = Array.isArray(raw?.categoriesInterested)
    ? raw.categoriesInterested.map(s).filter(Boolean)
    : [];

  return {
    application: {
      businessName,
      ownerName,
      taxNumber,
      tradeLicenseNumber: s(raw?.tradeLicenseNumber),
      businessType: businessType as WholesaleBusinessType,
      email,
      phone,
      website: s(raw?.website),
      expectedMonthlyPurchase: Number.isFinite(expectedMonthlyPurchase)
        ? Math.max(0, expectedMonthlyPurchase)
        : 0,
      categoriesInterested,
      businessAddress,
      warehouseAddress,
    },
  };
}
