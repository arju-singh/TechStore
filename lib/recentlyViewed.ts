"use client";

/**
 * Client-only "recently viewed" history, persisted in localStorage. Stores just
 * product slugs (most-recent first); the rail fetches fresh catalog data for them
 * so prices/stock are never stale. Mirrors the recent-searches pattern.
 */

const KEY = "techstore:recently-viewed";
const MAX = 12;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter((x) => typeof x === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

/** Record a viewed product, moving it to the front (deduped). */
export function pushRecentlyViewed(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const next = [slug, ...getRecentlyViewed().filter((s) => s !== slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) — non-fatal */
  }
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
