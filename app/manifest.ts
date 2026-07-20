import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION, THEME_COLOR } from "@/lib/site";

/**
 * Web app manifest (PWA). Makes the store installable to a home screen with a
 * standalone, browser-chrome-free shell. Icons are served from the file-based
 * /icon.svg (maskable + any); swap in rasterized PNGs for the widest device
 * coverage before shipping to production.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Phones, Laptops, Audio & More`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    categories: ["shopping", "business"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop all products", url: "/products", short_name: "Shop" },
      { name: "Wholesale", url: "/wholesale", short_name: "Wholesale" },
      { name: "Your cart", url: "/cart", short_name: "Cart" },
    ],
  };
}
