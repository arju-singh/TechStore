import { describe, it, expect } from "vitest";
import { rateLimit, enforceRateLimit } from "@/lib/rateLimit";

describe("rateLimit (sliding window)", () => {
  it("allows up to the limit, then blocks, then resets after the window", () => {
    const key = "unit-test-a";
    // limit 2 per 1000ms, deterministic clock via the `now` arg.
    expect(rateLimit(key, 2, 1000, 0)).toMatchObject({ ok: true, remaining: 1 });
    expect(rateLimit(key, 2, 1000, 100)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = rateLimit(key, 2, 1000, 200);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    // After the window rolls over, a fresh allowance begins.
    expect(rateLimit(key, 2, 1000, 1200)).toMatchObject({ ok: true, remaining: 1 });
  });

  it("keys are independent", () => {
    expect(rateLimit("unit-test-b", 1, 1000, 0).ok).toBe(true);
    expect(rateLimit("unit-test-c", 1, 1000, 0).ok).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  function req(ip: string): Request {
    return new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip } });
  }

  it("returns null within limit and a 429 Response when exceeded", async () => {
    const scope = "unit-enforce";
    const ip = "203.0.113.9";
    expect(enforceRateLimit(req(ip), scope, 1, 1000)).toBeNull();
    const res = enforceRateLimit(req(ip), scope, 1, 1000);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBeTruthy();
    const body = await res!.json();
    expect(body.error).toMatch(/too many/i);
  });
});
