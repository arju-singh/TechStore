import { describe, it, expect } from "vitest";
import { cloudinarySignature, buildTransform } from "@/lib/cloudinary";

describe("buildTransform", () => {
  it("defaults to automatic format + quality (optimized delivery)", () => {
    expect(buildTransform()).toBe("f_auto,q_auto");
  });
  it("appends sizing/crop options in order", () => {
    expect(buildTransform({ width: 400, crop: "fill" })).toBe("f_auto,q_auto,w_400,c_fill");
    expect(buildTransform({ width: 200, height: 200, crop: "thumb" })).toBe(
      "f_auto,q_auto,w_200,h_200,c_thumb"
    );
  });
  it("honors explicit format/quality", () => {
    expect(buildTransform({ format: "webp", quality: 80 })).toBe("f_webp,q_80");
  });
});

describe("cloudinarySignature", () => {
  const secret = "cldsecret";

  it("is deterministic and a 40-char SHA-1 hex", () => {
    const sig = cloudinarySignature({ folder: "techstore/products", timestamp: 1700000000 }, secret);
    expect(sig).toMatch(/^[a-f0-9]{40}$/);
    expect(cloudinarySignature({ folder: "techstore/products", timestamp: 1700000000 }, secret)).toBe(sig);
  });

  it("is independent of param insertion order", () => {
    const a = cloudinarySignature({ folder: "f", timestamp: 1, public_id: "p" }, secret);
    const b = cloudinarySignature({ public_id: "p", timestamp: 1, folder: "f" }, secret);
    expect(a).toBe(b);
  });

  it("excludes file / api_key / cloud_name / resource_type from the signature", () => {
    const base = cloudinarySignature({ folder: "f", timestamp: 1 }, secret);
    const withNoise = cloudinarySignature(
      { folder: "f", timestamp: 1, api_key: "123", cloud_name: "c", file: "x", resource_type: "image" },
      secret
    );
    expect(withNoise).toBe(base);
  });

  it("changes when a signed param changes", () => {
    const a = cloudinarySignature({ folder: "f", timestamp: 1 }, secret);
    const b = cloudinarySignature({ folder: "f", timestamp: 2 }, secret);
    expect(a).not.toBe(b);
  });
});
