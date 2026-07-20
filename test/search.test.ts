import { describe, it, expect } from "vitest";
import { getSearchSuggestions, getTrendingSearches } from "@/lib/products";
import { GET } from "@/app/api/search/suggestions/route";

describe("getSearchSuggestions", () => {
  it("returns product/category/brand matches for a query", async () => {
    const s = await getSearchSuggestions("apple");
    expect(s.query).toBe("apple");
    expect(s.products.length).toBeGreaterThan(0);
    expect(s.products.length).toBeLessThanOrEqual(6);
    expect(s.brands).toContain("Apple");
    // Every product carries the fields the dropdown renders.
    expect(s.products.every((p) => p.slug && p.name && typeof p.price === "number")).toBe(true);
  });

  it("respects the product limit", async () => {
    const s = await getSearchSuggestions("a", { productLimit: 2 });
    expect(s.products.length).toBeLessThanOrEqual(2);
  });

  it("returns trending (not results) for an empty query", async () => {
    const s = await getSearchSuggestions("");
    expect(s.products).toHaveLength(0);
    expect(s.trending.length).toBeGreaterThan(0);
  });
});

describe("getTrendingSearches", () => {
  it("derives non-empty, de-duplicated terms from the catalog", async () => {
    const t = await getTrendingSearches();
    expect(t.length).toBeGreaterThan(0);
    expect(new Set(t.map((x) => x.toLowerCase())).size).toBe(t.length);
  });
});

describe("GET /api/search/suggestions (route handler)", () => {
  it("returns 200 with suggestions for a query", async () => {
    const res = await GET(new Request("http://localhost/api/search/suggestions?q=apple"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
    expect(res.headers.get("Cache-Control")).toMatch(/max-age/);
  });

  it("returns trending for an empty query", async () => {
    const res = await GET(new Request("http://localhost/api/search/suggestions?q="));
    const body = await res.json();
    expect(body.products).toHaveLength(0);
    expect(body.trending.length).toBeGreaterThan(0);
  });
});
