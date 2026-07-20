import { describe, it, expect } from "vitest";
import {
  applyFlashSale,
  applyFlashToProducts,
  getActiveFlashSale,
  getFlashPriceMap,
  type FlashPriceMap,
} from "@/lib/flashSales";
import type { Product } from "@/lib/types";

function product(over: Partial<Product> = {}): Product {
  return {
    slug: "widget",
    name: "Widget",
    brand: "Acme",
    category: "smartphones",
    description: "",
    mrp: 1200,
    price: 1000,
    image: "https://example.com/x.jpg",
    rating: 4,
    numReviews: 10,
    stock: 5,
    featured: false,
    specs: {},
    ...over,
  };
}

const END = new Date(Date.now() + 3_600_000).toISOString();

describe("applyFlashSale", () => {
  it("discounts the price and records the original when covered", () => {
    const map: FlashPriceMap = new Map([["widget", { discountPct: 20, endsAt: END }]]);
    const out = applyFlashSale(product(), map);
    expect(out.price).toBe(800); // 1000 - 20%
    expect(out.flashSale).toEqual({ salePrice: 800, originalPrice: 1000, endsAt: END });
  });

  it("leaves products not in the sale untouched", () => {
    const map: FlashPriceMap = new Map([["other", { discountPct: 50, endsAt: END }]]);
    const out = applyFlashSale(product(), map);
    expect(out.price).toBe(1000);
    expect(out.flashSale).toBeUndefined();
  });

  it("never turns into a markup (rounding edge)", () => {
    const map: FlashPriceMap = new Map([["widget", { discountPct: 10, endsAt: END }]]);
    const out = applyFlashSale(product({ price: 1 }), map); // round(0.9)=1, not < 1
    expect(out.price).toBe(1);
    expect(out.flashSale).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const p = product();
    const map: FlashPriceMap = new Map([["widget", { discountPct: 20, endsAt: END }]]);
    applyFlashSale(p, map);
    expect(p.price).toBe(1000);
    expect(p.flashSale).toBeUndefined();
  });
});

describe("applyFlashToProducts", () => {
  it("returns the list unchanged when there is no active sale", () => {
    const list = [product(), product({ slug: "b" })];
    expect(applyFlashToProducts(list, new Map())).toBe(list);
  });

  it("applies to matching items only", () => {
    const list = [product({ slug: "a", price: 1000 }), product({ slug: "b", price: 500 })];
    const map: FlashPriceMap = new Map([["a", { discountPct: 50, endsAt: END }]]);
    const out = applyFlashToProducts(list, map);
    expect(out[0].price).toBe(500);
    expect(out[1].price).toBe(500);
    expect(out[1].flashSale).toBeUndefined();
  });
});

describe("active sale (in-memory seed)", () => {
  it("exposes an active sale and a non-empty price map", async () => {
    const sale = await getActiveFlashSale();
    expect(sale).not.toBeNull();
    expect(sale!.items.length).toBeGreaterThan(0);
    expect(Date.parse(sale!.endsAt)).toBeGreaterThan(Date.now());

    const map = await getFlashPriceMap();
    expect(map.size).toBe(sale!.items.length);
    for (const item of sale!.items) {
      expect(map.get(item.slug)?.discountPct).toBe(item.discountPct);
    }
  });
});
