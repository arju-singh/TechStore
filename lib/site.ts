/**
 * Canonical site identity — the single source of truth for the public origin,
 * brand name, and social defaults used by SEO metadata, the sitemap, robots,
 * the web-app manifest, and structured data (JSON-LD).
 *
 * The origin is read from NEXT_PUBLIC_SITE_URL (set it to the real domain in
 * production, e.g. https://techstore.example). It falls back to localhost so the
 * dev server and previews produce valid absolute URLs without any config.
 */

const RAW_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  "http://localhost:3000";

/** Absolute site origin with no trailing slash, e.g. "https://techstore.example". */
export const SITE_URL = RAW_URL.replace(/\/+$/, "");

/** `metadataBase` for Next — every relative OG/canonical URL resolves against this. */
export const siteUrl = new URL(SITE_URL);

export const SITE_NAME = "TechStore";

export const SITE_TAGLINE = "Phones, Laptops, Audio & More";

export const SITE_DESCRIPTION =
  "Shop the latest smartphones, laptops, audio gear and accessories with fast delivery across India — plus bulk wholesale pricing for businesses.";

/** Brand accent (lime) and surface (near-black), mirrored from tailwind.config.ts. */
export const THEME_COLOR = "#0a0a0b";
export const ACCENT_COLOR = "#9ee65a";

/** Build an absolute URL for a site-relative path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}
