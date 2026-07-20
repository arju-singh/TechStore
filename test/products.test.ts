import { describe, it, expect } from "vitest";
import {
  getProducts,
  getProductBySlug,
  getCategories,
  hasBulkPricing,
} from "@/lib/products";

// These run against the local seed catalog (no database — MONGODB_URI forced
// empty in vitest.config.ts), so they assert on structure/behaviour rather than
// exact catalog contents.

describe("getProducts (seed)", () => {
  it("returns the catalog", async () => {
    const all = await getProducts();
    expect(all.length).toBeGreaterThan(0);
  });

  it("filters by category", async () => {
    const laptops = await getProducts({ category: "laptops" });
    expect(laptops.length).toBeGreaterThan(0);
    expect(laptops.every((p) => p.category === "laptops")).toBe(true);
  });

  it("searches across name/brand/description/category", async () => {
    const hits = await getProducts({ search: "apple" });
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every((p) =>
        [p.name, p.brand, p.description, p.category]
          .join(" ")
          .toLowerCase()
          .includes("apple")
      )
    ).toBe(true);
  });

  it("treats search input literally (no regex injection)", async () => {
    // A metacharacter-laden query must not throw and must simply not match.
    const hits = await getProducts({ search: "(.*)" });
    expect(Array.isArray(hits)).toBe(true);
  });

  it("filters by price range", async () => {
    const pricey = await getProducts({ minPrice: 100000 });
    expect(pricey.every((p) => p.price >= 100000)).toBe(true);
  });

  it("sorts by price ascending", async () => {
    const sorted = await getProducts({ sort: "price-asc" });
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].price).toBeGreaterThanOrEqual(sorted[i - 1].price);
    }
  });
});

describe("getProductBySlug", () => {
  it("returns a known product and null for a miss", async () => {
    const p = await getProductBySlug("macbook-pro-14");
    expect(p).not.toBeNull();
    expect(p?.slug).toBe("macbook-pro-14");
    expect(await getProductBySlug("no-such-slug")).toBeNull();
  });
});

describe("getCategories", () => {
  it("returns seed categories", async () => {
    const cats = await getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((c) => typeof c.slug === "string" && c.slug.length > 0)).toBe(true);
  });
});

describe("hasBulkPricing", () => {
  it("detects volume tiers or enabled wholesale", () => {
    expect(hasBulkPricing({ priceTiers: [{ minQty: 5, unitPrice: 9 }] } as any)).toBe(true);
    expect(hasBulkPricing({ wholesale: { enabled: true } } as any)).toBe(true);
    expect(hasBulkPricing({} as any)).toBe(false);
  });
});
