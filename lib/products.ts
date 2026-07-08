import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import ProductModel from "@/lib/models/Product";
import CategoryModel from "@/lib/models/Category";
import { products as seedProducts, categories as seedCategories } from "@/data/seed";
import type { Category, Product } from "@/lib/types";
import { discountPercent } from "@/lib/pricing";

/*
 * Mutable in-memory catalog for the no-database path. Seeded from data/seed.ts
 * once, then admin CRUD mutates this copy (resets on server restart). Mirrors
 * the users/orders in-memory fallback so the whole app works without Mongo.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memProducts: Product[] | undefined;
}
function memCatalog(): Product[] {
  if (!global._memProducts) {
    global._memProducts = seedProducts.map((p) => ({
      ...p,
      specs: { ...p.specs },
    }));
  }
  return global._memProducts;
}

/** Escape regex metacharacters so user input is matched as a literal string. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "discount";

export interface ProductQuery {
  category?: string;
  search?: string;
  sort?: SortKey;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  /** Only products with volume tiers or a wholesale price. */
  bulk?: boolean;
  /** Restrict to a single vendor's catalog (by vendor slug). */
  vendor?: string;
}

/** True when a product has any bulk/wholesale pricing configured. */
export function hasBulkPricing(p: Product): boolean {
  return (p.priceTiers?.length ?? 0) > 0 || Boolean(p.wholesale?.enabled);
}

/** Shared "shop by price" tiers, tuned to the electronics catalog. */
export interface PriceRange {
  key: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}
export const PRICE_RANGES: PriceRange[] = [
  { key: "u2000", label: "Under ₹2,000", maxPrice: 2000 },
  { key: "u10000", label: "Under ₹10,000", maxPrice: 10000 },
  { key: "u25000", label: "Under ₹25,000", maxPrice: 25000 },
  { key: "u75000", label: "Under ₹75,000", maxPrice: 75000 },
  { key: "a75000", label: "₹75,000 & above", minPrice: 75000 },
];

// discountPercent lives in the client-safe lib/pricing module; re-export it so
// server callers can keep importing it from here.
export { discountPercent };

function toPlainProduct(doc: any): Product {
  const specs =
    doc.specs instanceof Map ? Object.fromEntries(doc.specs) : doc.specs ?? {};
  const priceTiers = Array.isArray(doc.priceTiers)
    ? doc.priceTiers
        .map((t: any) => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) }))
        .filter((t: any) => Number.isFinite(t.minQty) && Number.isFinite(t.unitPrice))
        .sort((a: any, b: any) => a.minQty - b.minQty)
    : [];
  const w = doc.wholesale;
  const wholesaleTiers = Array.isArray(w?.tiers)
    ? w.tiers
        .map((t: any) => ({
          minQty: Number(t.minQty),
          maxQty: t.maxQty == null ? null : Number(t.maxQty),
          unitPrice: Number(t.unitPrice),
        }))
        .filter(
          (t: any) => Number.isFinite(t.minQty) && Number.isFinite(t.unitPrice)
        )
        .sort((a: any, b: any) => a.minQty - b.minQty)
    : [];
  const wholesale =
    w && typeof w === "object"
      ? {
          enabled: Boolean(w.enabled),
          unitPrice: Number(w.unitPrice) || 0,
          moq: Number(w.moq) || 1,
          tiers: wholesaleTiers,
        }
      : { enabled: false, unitPrice: 0, moq: 1, tiers: [] };
  return {
    slug: doc.slug,
    name: doc.name,
    brand: doc.brand,
    category: doc.category,
    description: doc.description,
    mrp: doc.mrp,
    price: doc.price,
    image: doc.image,
    rating: doc.rating,
    numReviews: doc.numReviews,
    stock: doc.stock,
    featured: doc.featured,
    specs,
    priceTiers,
    wholesale,
    gstRate: typeof doc.gstRate === "number" ? doc.gstRate : 18,
    vendorSlug: doc.vendorSlug ?? "",
    vendorName: doc.vendorName ?? "",
  };
}

function sortProducts(list: Product[], sort: SortKey = "featured"): Product[] {
  const arr = [...list];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "rating":
      return arr.sort((a, b) => b.rating - a.rating);
    case "discount":
      return arr.sort((a, b) => discountPercent(b) - discountPercent(a));
    case "featured":
    default:
      return arr.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating
      );
  }
}

/** Filter/sort the local in-memory catalog — used as the no-database fallback. */
function querySeed({ category, search, sort, featured, minPrice, maxPrice, bulk, vendor }: ProductQuery): Product[] {
  let list = memCatalog();
  if (category) list = list.filter((p) => p.category === category);
  if (vendor) list = list.filter((p) => (p.vendorSlug ?? "") === vendor);
  if (featured) list = list.filter((p) => p.featured);
  if (bulk) list = list.filter(hasBulkPricing);
  if (typeof minPrice === "number") list = list.filter((p) => p.price >= minPrice);
  if (typeof maxPrice === "number") list = list.filter((p) => p.price <= maxPrice);
  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }
  return sortProducts(list, sort);
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  if (!hasDatabase) return querySeed(query);

  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.vendor) filter.vendorSlug = query.vendor;
  if (query.featured) filter.featured = true;
  if (query.bulk) {
    // Use $and so this coexists with the search $or below without clobbering it.
    filter.$and = [
      { $or: [{ "priceTiers.0": { $exists: true } }, { "wholesale.enabled": true }] },
    ];
  }
  if (typeof query.minPrice === "number" || typeof query.maxPrice === "number") {
    const price: Record<string, number> = {};
    if (typeof query.minPrice === "number") price.$gte = query.minPrice;
    if (typeof query.maxPrice === "number") price.$lte = query.maxPrice;
    filter.price = price;
  }
  if (query.search) {
    // Escape user input so it's matched literally — prevents regex-injection /
    // ReDoS from a crafted search string reaching the Mongo query.
    const rx = new RegExp(escapeRegExp(query.search.trim()), "i");
    filter.$or = [{ name: rx }, { brand: rx }, { description: rx }, { category: rx }];
  }
  const docs = await ProductModel.find(filter).lean();
  return sortProducts(docs.map(toPlainProduct), query.sort);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasDatabase) return memCatalog().find((p) => p.slug === slug) ?? null;
  await connectToDatabase();
  const doc = await ProductModel.findOne({ slug }).lean();
  return doc ? toPlainProduct(doc) : null;
}

/** Every product belonging to a vendor (by slug), newest-relevant first. */
export async function getProductsByVendor(vendorSlug: string): Promise<Product[]> {
  if (!vendorSlug) return [];
  return getProducts({ vendor: vendorSlug, sort: "featured" });
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const list = await getProducts({ featured: true, sort: "featured" });
  return list.slice(0, limit);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const list = await getProducts({ category: product.category, sort: "rating" });
  return list.filter((p) => p.slug !== product.slug).slice(0, limit);
}

export async function getCategories(): Promise<Category[]> {
  if (!hasDatabase) return seedCategories;
  await connectToDatabase();
  const docs = await CategoryModel.find().lean();
  if (docs.length === 0) return seedCategories;
  return docs.map((d: any) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    image: d.image,
  }));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Admin write operations
// ---------------------------------------------------------------------------

export async function createProduct(data: Product): Promise<Product> {
  if (!hasDatabase) {
    const catalog = memCatalog();
    if (catalog.some((p) => p.slug === data.slug)) {
      throw new Error("A product with this slug already exists.");
    }
    const product: Product = { ...data, specs: { ...data.specs } };
    catalog.unshift(product);
    return product;
  }
  await connectToDatabase();
  const existing = await ProductModel.findOne({ slug: data.slug }).lean();
  if (existing) throw new Error("A product with this slug already exists.");
  const doc = await ProductModel.create(data);
  return toPlainProduct(doc.toObject());
}

export async function updateProduct(
  slug: string,
  data: Partial<Product>
): Promise<Product | null> {
  if (!hasDatabase) {
    const catalog = memCatalog();
    const idx = catalog.findIndex((p) => p.slug === slug);
    if (idx === -1) return null;
    const updated: Product = {
      ...catalog[idx],
      ...data,
      slug, // slug is the key; keep it stable
      specs: data.specs ? { ...data.specs } : catalog[idx].specs,
    };
    catalog[idx] = updated;
    return updated;
  }
  await connectToDatabase();
  const { slug: _ignore, ...rest } = data;
  const doc = await ProductModel.findOneAndUpdate({ slug }, rest, {
    new: true,
  }).lean();
  return doc ? toPlainProduct(doc) : null;
}

export async function deleteProduct(slug: string): Promise<boolean> {
  if (!hasDatabase) {
    const catalog = memCatalog();
    const idx = catalog.findIndex((p) => p.slug === slug);
    if (idx === -1) return false;
    catalog.splice(idx, 1);
    return true;
  }
  await connectToDatabase();
  const res = await ProductModel.deleteOne({ slug });
  return res.deletedCount > 0;
}

/**
 * Atomically decrement stock for a product, but only if at least `qty` is
 * available. Returns true on success, false if insufficient stock (or missing).
 * Prevents overselling under concurrent/bulk orders: the Mongo update is a single
 * conditional operation, so two simultaneous orders can't both pass the check.
 */
export async function decrementStock(slug: string, qty: number): Promise<boolean> {
  if (qty <= 0) return true;
  if (!hasDatabase) {
    const catalog = memCatalog();
    const p = catalog.find((x) => x.slug === slug);
    if (!p || p.stock < qty) return false;
    p.stock -= qty;
    return true;
  }
  await connectToDatabase();
  const res = await ProductModel.findOneAndUpdate(
    { slug, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true }
  ).lean();
  return Boolean(res);
}

/** Give stock back (used to roll back a failed checkout after decrementing). */
export async function restoreStock(slug: string, qty: number): Promise<void> {
  if (qty <= 0) return;
  if (!hasDatabase) {
    const catalog = memCatalog();
    const p = catalog.find((x) => x.slug === slug);
    if (p) p.stock += qty;
    return;
  }
  await connectToDatabase();
  await ProductModel.updateOne({ slug }, { $inc: { stock: qty } });
}

/** Product count per category slug, for badges in the UI. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const all = await getProducts();
  return all.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});
}
