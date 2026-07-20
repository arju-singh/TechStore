import { describe, it, expect } from "vitest";
import { formatINR } from "@/lib/format";

describe("formatINR", () => {
  it("formats with the ₹ symbol and Indian digit grouping", () => {
    expect(formatINR(64999)).toBe("₹64,999");
    expect(formatINR(169900)).toBe("₹1,69,900"); // lakh grouping
    expect(formatINR(0)).toBe("₹0");
  });
  it("rounds to whole rupees", () => {
    expect(formatINR(99.6)).toBe("₹100");
  });
});
