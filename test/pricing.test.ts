import { describe, it, expect } from "vitest";
import {
  discountPercent,
  unitPriceFor,
  moqError,
  bestPriceFor,
  deliveryFeeFor,
  computeTotals,
  gstBreakup,
  priceLines,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  RETAIL_CONTEXT,
  type Priceable,
} from "@/lib/pricing";

const WHOLESALE = { isWholesaler: true };

describe("discountPercent", () => {
  it("computes the MRP-vs-price discount, rounded", () => {
    expect(discountPercent({ mrp: 100, price: 80 })).toBe(20);
    expect(discountPercent({ mrp: 194900, price: 169900 })).toBe(13);
  });
  it("returns 0 when there is no discount or bad data", () => {
    expect(discountPercent({ mrp: 100, price: 100 })).toBe(0);
    expect(discountPercent({ mrp: 0, price: 0 })).toBe(0);
    expect(discountPercent({ mrp: 100, price: 120 })).toBe(0); // price above MRP
  });
});

describe("deliveryFeeFor", () => {
  it("is free at/above the threshold, charged below, zero for an empty cart", () => {
    expect(deliveryFeeFor(0)).toBe(0);
    expect(deliveryFeeFor(100)).toBe(DELIVERY_FEE);
    expect(deliveryFeeFor(FREE_DELIVERY_THRESHOLD - 1)).toBe(DELIVERY_FEE);
    expect(deliveryFeeFor(FREE_DELIVERY_THRESHOLD)).toBe(0);
    expect(deliveryFeeFor(10000)).toBe(0);
  });
});

describe("unitPriceFor", () => {
  const base: Priceable = {
    price: 1000,
    mrp: 1200,
    priceTiers: [{ minQty: 5, unitPrice: 900 }],
    wholesale: { enabled: true, unitPrice: 700, moq: 5, tiers: [] },
  };

  it("returns retail price below any tier", () => {
    expect(unitPriceFor(base, 1)).toBe(1000);
    expect(unitPriceFor(base, 4)).toBe(1000);
  });

  it("applies a public volume break once the quantity qualifies (everyone)", () => {
    expect(unitPriceFor(base, 5)).toBe(900);
    expect(unitPriceFor(base, 50)).toBe(900);
  });

  it("does NOT give a retail buyer the wholesale contract price", () => {
    // qty 5 qualifies for the 900 public tier but not the 700 wholesale rate.
    expect(unitPriceFor(base, 5, RETAIL_CONTEXT)).toBe(900);
  });

  it("gives an approved wholesaler the legacy contract price", () => {
    expect(unitPriceFor(base, 10, WHOLESALE)).toBe(700);
  });

  it("honors wholesale quantity bands only within their range", () => {
    const banded: Priceable = {
      price: 1000,
      mrp: 1200,
      wholesale: {
        enabled: true,
        unitPrice: 0,
        moq: 1,
        tiers: [
          { minQty: 10, maxQty: 49, unitPrice: 850 },
          { minQty: 50, maxQty: null, unitPrice: 800 },
        ],
      },
    };
    expect(unitPriceFor(banded, 5, WHOLESALE)).toBe(1000); // below first band
    expect(unitPriceFor(banded, 10, WHOLESALE)).toBe(850);
    expect(unitPriceFor(banded, 60, WHOLESALE)).toBe(800);
    expect(unitPriceFor(banded, 60, RETAIL_CONTEXT)).toBe(1000); // retail never sees it
  });

  it("is monotonic — buying more never costs more per unit", () => {
    const prev = [1, 4, 5, 20, 100].map((q) => unitPriceFor(base, q, WHOLESALE));
    for (let i = 1; i < prev.length; i++) {
      expect(prev[i]).toBeLessThanOrEqual(prev[i - 1]);
    }
  });
});

describe("moqError", () => {
  const legacy: Priceable = {
    price: 1000,
    mrp: 1200,
    wholesale: { enabled: true, unitPrice: 700, moq: 5, tiers: [] },
  };
  it("blocks a wholesaler below MOQ when getting the wholesale price", () => {
    expect(moqError(legacy, 3, WHOLESALE, "Widget")).toMatch(/minimum wholesale order is 5/);
  });
  it("allows the wholesaler at/above MOQ", () => {
    expect(moqError(legacy, 5, WHOLESALE)).toBeNull();
  });
  it("never blocks a retail buyer", () => {
    expect(moqError(legacy, 1, RETAIL_CONTEXT)).toBeNull();
  });
});

describe("bestPriceFor", () => {
  it("returns the lowest reachable price for the buyer", () => {
    const p: Priceable = {
      price: 1000,
      mrp: 1200,
      priceTiers: [{ minQty: 5, unitPrice: 900 }],
      wholesale: { enabled: true, unitPrice: 700, moq: 5, tiers: [] },
    };
    expect(bestPriceFor(p, RETAIL_CONTEXT)).toBe(900);
    expect(bestPriceFor(p, WHOLESALE)).toBe(700);
  });
});

describe("computeTotals", () => {
  it("sums a cart and gives free delivery over the threshold", () => {
    const t = computeTotals([{ unitPrice: 1000, mrp: 1200, qty: 2 }]);
    expect(t.count).toBe(2);
    expect(t.subtotal).toBe(2000);
    expect(t.mrpTotal).toBe(2400);
    expect(t.savings).toBe(400);
    expect(t.deliveryFee).toBe(0);
    expect(t.grandTotal).toBe(2000);
  });

  it("charges delivery on a small order", () => {
    const t = computeTotals([{ unitPrice: 100, mrp: 100, qty: 1 }]);
    expect(t.deliveryFee).toBe(DELIVERY_FEE);
    expect(t.grandTotal).toBe(100 + DELIVERY_FEE);
  });

  it("applies a coupon but never below zero", () => {
    const t = computeTotals([{ unitPrice: 1000, mrp: 1000, qty: 2 }], 500);
    expect(t.couponDiscount).toBe(500);
    expect(t.grandTotal).toBe(1500);

    const over = computeTotals([{ unitPrice: 1000, mrp: 1000, qty: 2 }], 5000);
    expect(over.couponDiscount).toBe(2000); // clamped to subtotal
    expect(over.grandTotal).toBe(0);
  });
});

describe("gstBreakup", () => {
  it("extracts GST from a GST-inclusive amount, split into CGST + SGST", () => {
    const b = gstBreakup(118, 18);
    expect(b.taxable).toBeCloseTo(100, 5);
    expect(b.tax).toBeCloseTo(18, 5);
    expect(b.cgst).toBeCloseTo(9, 5);
    expect(b.sgst).toBeCloseTo(9, 5);
  });
  it("is a no-op at 0%", () => {
    const b = gstBreakup(100, 0);
    expect(b.taxable).toBe(100);
    expect(b.tax).toBe(0);
  });
});

describe("priceLines", () => {
  it("prices catalog entries into lines with the effective unit price", () => {
    const lines = priceLines(
      [{ product: { price: 1000, mrp: 1200, priceTiers: [{ minQty: 5, unitPrice: 900 }] }, qty: 5 }],
      RETAIL_CONTEXT
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].unitPrice).toBe(900);
    expect(lines[0].qty).toBe(5);
  });
});
