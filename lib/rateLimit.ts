import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Deliberately dependency-free and process-local — it mirrors the app's other
 * in-memory fallbacks (users/orders/products). That means it protects a single
 * server instance only; behind multiple workers or a load balancer you'd swap
 * this for a shared store (Redis/Upstash). It is still a meaningful barrier to
 * brute-force / credential-stuffing / order-spam from a single client.
 */

interface Hit {
  count: number;
  resetAt: number; // epoch ms when the window rolls over
}

declare global {
  // eslint-disable-next-line no-var
  var _rateLimitBuckets: Map<string, Hit> | undefined;
}
const buckets: Map<string, Hit> = global._rateLimitBuckets ?? new Map();
global._rateLimitBuckets = buckets;

export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number;
}

/**
 * Record a hit for `key` and report whether it's within `limit` per `windowMs`.
 * A fresh window starts on the first hit and after each reset.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  existing.count += 1;
  const remaining = limit - existing.count;
  if (remaining < 0) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining, retryAfter: 0 };
}

/**
 * Best-effort client identifier from a request. Uses the standard proxy headers,
 * falling back to a constant so the limiter still works locally (shared bucket).
 */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "local";
}

/**
 * Convenience wrapper: enforce a limit for `(scope, client)` and, when exceeded,
 * return a ready-to-send 429 Response (else null so the caller proceeds).
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): Response | null {
  const result = rateLimit(`${scope}:${clientKey(request)}`, limit, windowMs);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    }
  );
}
