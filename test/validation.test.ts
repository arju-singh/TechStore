import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  validateName,
  normalizeGstRate,
  slugify,
  validateProduct,
  validateAddress,
  validateWholesalerApplication,
} from "@/lib/validation";

describe("credential validators", () => {
  it("validateEmail", () => {
    expect(validateEmail("a@b.com")).toBeNull();
    expect(validateEmail("user.name@example.co.in")).toBeNull();
    expect(validateEmail("nope")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail(123)).not.toBeNull();
  });
  it("validatePassword requires 8+ chars", () => {
    expect(validatePassword("1234567")).not.toBeNull();
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword(undefined)).not.toBeNull();
  });
  it("validateName requires 2+ chars", () => {
    expect(validateName("A")).not.toBeNull();
    expect(validateName("Al")).toBeNull();
    expect(validateName("   ")).not.toBeNull();
  });
});

describe("normalizeGstRate", () => {
  it("snaps to the nearest legal slab", () => {
    expect(normalizeGstRate(17)).toBe(18);
    expect(normalizeGstRate(4)).toBe(5);
    expect(normalizeGstRate(0)).toBe(0);
    expect(normalizeGstRate(26)).toBe(28);
    expect(normalizeGstRate("12")).toBe(12);
  });
  it("defaults to 18 for bad input", () => {
    expect(normalizeGstRate(-1)).toBe(18);
    expect(normalizeGstRate("nan")).toBe(18);
    expect(normalizeGstRate(undefined)).toBe(18);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(slugify("  Foo -- Bar ")).toBe("foo-bar");
    expect(slugify("iPhone 13 Pro")).toBe("iphone-13-pro");
  });
});

describe("validateProduct", () => {
  const good = {
    name: "Test Phone",
    slug: "test-phone",
    brand: "Acme",
    category: "smartphones",
    mrp: 1000,
    price: 800,
    stock: 5,
    image: "https://example.com/x.jpg",
  };

  it("accepts a valid product", () => {
    const res = validateProduct(good);
    expect("product" in res).toBe(true);
    if ("product" in res) {
      expect(res.product.slug).toBe("test-phone");
      expect(res.product.gstRate).toBe(18);
    }
  });

  it("rejects price above MRP", () => {
    const res = validateProduct({ ...good, price: 2000 });
    expect("error" in res && /exceed MRP/i.test(res.error)).toBe(true);
  });

  it("rejects a non-http image", () => {
    const res = validateProduct({ ...good, image: "ftp://x" });
    expect("error" in res).toBe(true);
  });

  it("rejects a volume tier priced above the base price", () => {
    const res = validateProduct({ ...good, priceTiers: [{ minQty: 5, unitPrice: 900 }] });
    expect("error" in res).toBe(true); // 900 > selling price 800
  });

  it("rejects non-monotonic volume tiers", () => {
    const res = validateProduct({
      ...good,
      price: 800,
      priceTiers: [
        { minQty: 5, unitPrice: 700 },
        { minQty: 10, unitPrice: 750 }, // more qty but pricier → invalid
      ],
    });
    expect("error" in res).toBe(true);
  });
});

describe("validateAddress", () => {
  const good = {
    fullName: "Asha Rao",
    phone: "9876543210",
    line1: "12 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
  };
  it("accepts a valid address", () => {
    expect("address" in validateAddress(good)).toBe(true);
  });
  it("rejects a bad phone and pincode", () => {
    expect("error" in validateAddress({ ...good, phone: "12345" })).toBe(true);
    expect("error" in validateAddress({ ...good, pincode: "0560001" })).toBe(true);
  });
});

describe("validateWholesalerApplication (GSTIN)", () => {
  const good = {
    businessName: "Acme Distributors",
    ownerName: "Raj Kumar",
    taxNumber: "27AAPFU0939F1ZV",
    businessType: "distributor",
    email: "raj@acme.com",
    phone: "9876543210",
    businessAddress: { line1: "9 Industrial Area", city: "Pune", state: "MH", pincode: "411001" },
  };
  it("accepts a valid application and upper-cases the GSTIN", () => {
    const res = validateWholesalerApplication({ ...good, taxNumber: "27aapfu0939f1zv" });
    expect("application" in res).toBe(true);
    if ("application" in res) expect(res.application.taxNumber).toBe("27AAPFU0939F1ZV");
  });
  it("rejects a malformed tax number", () => {
    const res = validateWholesalerApplication({ ...good, taxNumber: "NOTAGSTIN" });
    expect("error" in res && /Tax number invalid/.test(res.error)).toBe(true);
  });
  it("rejects an unknown business type", () => {
    const res = validateWholesalerApplication({ ...good, businessType: "spaceship" });
    expect("error" in res).toBe(true);
  });
});
