import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/jsonLdSafe";

const LS = "\u2028"; // line separator
const PS = "\u2029"; // paragraph separator

describe("serializeJsonLd (XSS-safe JSON-LD)", () => {
  it("escapes </script> so it cannot break out of the script tag", () => {
    const out = serializeJsonLd({ name: "evil</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("escapes <, >, & and the U+2028/U+2029 separators", () => {
    const out = serializeJsonLd({ a: "<", b: ">", c: "&", d: LS, e: PS });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("remains valid JSON that round-trips to the original data", () => {
    const data = {
      name: 'MacBook Pro 14" </script> & <b>bold</b>',
      price: 169900,
      nested: { sep: `a${LS}b` },
    };
    const out = serializeJsonLd(data);
    expect(JSON.parse(out)).toEqual(data); // structured data unchanged for crawlers
  });

  it("preserves ordinary spaces (does not corrupt them)", () => {
    const out = serializeJsonLd({ name: "Space Grey Edition" });
    expect(JSON.parse(out).name).toBe("Space Grey Edition");
    expect(out).toContain("Space Grey Edition");
  });
});
