import type { Category, Product, Vendor } from "@/lib/types";
import type { Coupon } from "@/lib/coupons";

/**
 * Local sample catalog — REAL products with matching real photos. Images are
 * hosted on dummyjson's CDN (real product photography, license-clean for demo
 * use); swap the `image` URLs for your own product shots anytime. This is the
 * single source of truth for `npm run seed` and the no-database fallback.
 */

/** Picsum placeholder (used only for demo vendor logos). */
const img = (seed: string) => `https://picsum.photos/seed/${seed}/700/700`;

/** Real product photo on the dummyjson CDN. */
const dj = (cat: string, slug: string) =>
  `https://cdn.dummyjson.com/product-images/${cat}/${slug}/thumbnail.webp`;

export const categories: Category[] = [
  { slug: "smartphones", name: "Smartphones", tagline: "Flagship to everyday, all unlocked", image: dj("smartphones", "iphone-13-pro") },
  { slug: "laptops", name: "Laptops", tagline: "Ultrabooks, creator & work machines", image: dj("laptops", "apple-macbook-pro-14-inch-space-grey") },
  { slug: "tablets", name: "Tablets", tagline: "iPads & Android tablets", image: dj("tablets", "ipad-mini-2021-starlight") },
  { slug: "audio", name: "Audio", tagline: "Earbuds, headphones & speakers", image: dj("mobile-accessories", "apple-airpods-max-silver") },
  { slug: "wearables", name: "Wearables", tagline: "Smartwatches & timepieces", image: dj("mobile-accessories", "apple-watch-series-4-gold") },
  { slug: "accessories", name: "Accessories", tagline: "Chargers, cases & power", image: dj("mobile-accessories", "apple-magsafe-battery-pack") },
];

/**
 * Demo marketplace vendors — populate "Sold by", /stores and admin Stores out of
 * the box. To operate one for real, sign up and apply at /vendor/apply.
 */
export const vendors: Vendor[] = [
  {
    id: "ven_gadget-galaxy",
    slug: "gadget-galaxy",
    name: "Gadget Galaxy",
    ownerUserId: "seed-owner-gadget-galaxy",
    email: "seller@gadgetgalaxy.example",
    phone: "+91 98200 10001",
    description: "Independent multi-brand electronics seller — phones and laptops at keen prices, dispatched from Mumbai.",
    logo: img("vendor-gadget-galaxy"),
    status: "approved",
    commissionRate: null,
    gstin: "27AAECG1234F1Z5",
    address: { line1: "12 Linking Road", line2: "Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050" },
    policies: "7-day returns on unopened items. Ships within 24 hours on business days.",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "ven_soundstage",
    slug: "soundstage",
    name: "SoundStage Audio",
    ownerUserId: "seed-owner-soundstage",
    email: "hello@soundstage.example",
    phone: "+91 98200 10002",
    description: "Audio specialists. Earbuds, headphones and speakers, hand-picked and demoed before they ship.",
    logo: img("vendor-soundstage"),
    status: "approved",
    commissionRate: 12,
    gstin: "29AAFCS5678K1Z2",
    address: { line1: "45 Brigade Road", line2: "", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    policies: "10-day returns. Free replacement on DOA units.",
    createdAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "ven_snapgear",
    slug: "snapgear",
    name: "SnapGear",
    ownerUserId: "seed-owner-snapgear",
    email: "store@snapgear.example",
    phone: "+91 98200 10003",
    description: "Tablets, wearables and creator gear from a family-run shop — with real advice.",
    logo: img("vendor-snapgear"),
    status: "approved",
    commissionRate: null,
    gstin: "07AAGCS9012M1Z8",
    address: { line1: "88 Nehru Place", line2: "", city: "New Delhi", state: "Delhi", pincode: "110019" },
    policies: "7-day returns. 6-month seller warranty on all devices.",
    createdAt: "2026-01-20T00:00:00.000Z",
  },
];

/** Which vendor sells which product (by product slug). Unlisted = house product. */
const VENDOR_OF: Record<string, string> = {
  "iphone-x": "gadget-galaxy",
  "samsung-galaxy-s10": "gadget-galaxy",
  "oppo-f19-pro-plus": "gadget-galaxy",
  "realme-xt": "gadget-galaxy",
  "lenovo-yoga-920": "gadget-galaxy",
  "apple-airpods": "soundstage",
  "apple-airpods-max": "soundstage",
  "beats-flex": "soundstage",
  "amazon-echo-plus": "soundstage",
  "homepod-mini": "soundstage",
  "ipad-mini": "snapgear",
  "samsung-galaxy-tab-s8-plus": "snapgear",
  "apple-watch-series-4": "snapgear",
  "magsafe-battery-pack": "snapgear",
};

const rawProducts: Product[] = [
  // Smartphones
  {
    slug: "iphone-13-pro",
    name: "Apple iPhone 13 Pro (256GB)",
    brand: "Apple",
    category: "smartphones",
    description: "6.1\" Super Retina XDR ProMotion display, A15 Bionic, and a Pro camera system with 3x telephoto and cinematic mode.",
    mrp: 105900, price: 91999, image: dj("smartphones", "iphone-13-pro"),
    rating: 4.7, numReviews: 4231, stock: 40, featured: true,
    specs: { Display: "6.1\" OLED 120Hz", Chip: "A15 Bionic", Storage: "256GB", Camera: "12MP triple, 3x tele", Battery: "Up to 22h video" },
  },
  {
    slug: "iphone-x",
    name: "Apple iPhone X (64GB)",
    brand: "Apple",
    category: "smartphones",
    description: "The phone that introduced the notch and Face ID — a 5.8\" Super Retina OLED with a dual 12MP camera.",
    mrp: 86900, price: 74999, image: dj("smartphones", "iphone-x"),
    rating: 4.3, numReviews: 2890, stock: 37, featured: false,
    specs: { Display: "5.8\" OLED", Chip: "A11 Bionic", Storage: "64GB", Camera: "12MP dual", Security: "Face ID" },
  },
  {
    slug: "samsung-galaxy-s10",
    name: "Samsung Galaxy S10 (128GB)",
    brand: "Samsung",
    category: "smartphones",
    description: "6.1\" Dynamic AMOLED with an in-display fingerprint sensor and a versatile triple camera.",
    mrp: 66900, price: 57999, image: dj("smartphones", "samsung-galaxy-s10"),
    rating: 4.4, numReviews: 5120, stock: 22, featured: false,
    specs: { Display: "6.1\" AMOLED", Chip: "Exynos 9820", Storage: "128GB", Camera: "12MP + 12MP + 16MP", Battery: "3400mAh" },
  },
  {
    slug: "oppo-f19-pro-plus",
    name: "Oppo F19 Pro+ 5G (128GB)",
    brand: "Oppo",
    category: "smartphones",
    description: "Slim 5G mid-ranger with a 6.43\" AMOLED, 50W flash charge and a 48MP AI quad camera.",
    mrp: 37900, price: 32999, image: dj("smartphones", "oppo-f19-pro-plus"),
    rating: 4.2, numReviews: 1780, stock: 78, featured: false,
    specs: { Display: "6.43\" AMOLED", Chip: "Dimensity 800U", Storage: "128GB", Charging: "50W", Camera: "48MP quad" },
  },
  {
    slug: "realme-xt",
    name: "Realme XT (128GB)",
    brand: "Realme",
    category: "smartphones",
    description: "64MP quad-camera phone with a 6.4\" Super AMOLED display and VOOC fast charging.",
    mrp: 33900, price: 28999, image: dj("smartphones", "realme-xt"),
    rating: 4.5, numReviews: 3410, stock: 80, featured: false,
    specs: { Display: "6.4\" AMOLED", Chip: "Snapdragon 712", Storage: "128GB", Camera: "64MP quad", Battery: "4000mAh" },
  },
  {
    slug: "vivo-x21",
    name: "Vivo X21 (128GB)",
    brand: "Vivo",
    category: "smartphones",
    description: "6.28\" FHD+ AMOLED with an in-display fingerprint scanner and dual rear cameras.",
    mrp: 47900, price: 41999, image: dj("smartphones", "vivo-x21"),
    rating: 4.1, numReviews: 940, stock: 15, featured: false,
    specs: { Display: "6.28\" AMOLED", Chip: "Snapdragon 660", Storage: "128GB", Camera: "12MP + 5MP", Battery: "3200mAh" },
  },

  // Laptops
  {
    slug: "macbook-pro-14",
    name: "Apple MacBook Pro 14\" (M-series, Space Grey)",
    brand: "Apple",
    category: "laptops",
    description: "14.2\" Liquid Retina XDR, blistering performance and all-day battery in a pro-grade aluminium body.",
    mrp: 194900, price: 169900, image: dj("laptops", "apple-macbook-pro-14-inch-space-grey"),
    rating: 4.8, numReviews: 1980, stock: 24, featured: true,
    specs: { Display: "14.2\" Liquid Retina XDR", RAM: "16GB", Storage: "512GB SSD", Ports: "3x TB4, HDMI, SD", Battery: "Up to 18h" },
  },
  {
    slug: "dell-xps-13",
    name: "Dell XPS 13 (9300)",
    brand: "Dell",
    category: "laptops",
    description: "Featherweight 13.4\" InfinityEdge ultrabook with a stunning display and premium machined chassis.",
    mrp: 142900, price: 124900, image: dj("laptops", "new-dell-xps-13-9300-laptop"),
    rating: 4.4, numReviews: 1120, stock: 74, featured: false,
    specs: { Display: "13.4\" FHD+", CPU: "Intel Core i7", RAM: "16GB", Storage: "512GB SSD", Weight: "1.2kg" },
  },
  {
    slug: "asus-zenbook-pro-duo",
    name: "Asus Zenbook Pro Duo (Dual Screen)",
    brand: "Asus",
    category: "laptops",
    description: "Creator laptop with a secondary ScreenPad Plus display above the keyboard for a true multitasking canvas.",
    mrp: 169900, price: 149900, image: dj("laptops", "asus-zenbook-pro-dual-screen-laptop"),
    rating: 4.5, numReviews: 640, stock: 45, featured: false,
    specs: { Display: "15.6\" 4K OLED + ScreenPad", CPU: "Intel Core i9", RAM: "32GB", GPU: "RTX", Storage: "1TB SSD" },
  },
  {
    slug: "huawei-matebook-x-pro",
    name: "Huawei MateBook X Pro",
    brand: "Huawei",
    category: "laptops",
    description: "Gorgeous 3:2 FullView touch display in a slim, light magnesium-alloy body.",
    mrp: 132900, price: 116900, image: dj("laptops", "huawei-matebook-x-pro"),
    rating: 4.9, numReviews: 820, stock: 75, featured: false,
    specs: { Display: "13.9\" 3K touch", CPU: "Intel Core i7", RAM: "16GB", Storage: "1TB SSD", Weight: "1.33kg" },
  },
  {
    slug: "lenovo-yoga-920",
    name: "Lenovo Yoga 920 (2-in-1)",
    brand: "Lenovo",
    category: "laptops",
    description: "Convertible 2-in-1 with a 360° hinge, far-field mics and a precision pen for notes and sketches.",
    mrp: 104900, price: 89900, image: dj("laptops", "lenovo-yoga-920"),
    rating: 4.2, numReviews: 510, stock: 40, featured: false,
    specs: { Display: "13.9\" FHD touch", CPU: "Intel Core i7", RAM: "16GB", Storage: "512GB SSD", Hinge: "360° watchband" },
  },

  // Tablets
  {
    slug: "ipad-mini",
    name: "Apple iPad mini (2021, Starlight)",
    brand: "Apple",
    category: "tablets",
    description: "8.3\" Liquid Retina, A15 Bionic and Apple Pencil (2nd gen) support in a pocketable, all-screen design.",
    mrp: 51900, price: 44900, image: dj("tablets", "ipad-mini-2021-starlight"),
    rating: 4.7, numReviews: 2210, stock: 47, featured: true,
    specs: { Display: "8.3\" Liquid Retina", Chip: "A15 Bionic", Storage: "64GB", Pencil: "2nd gen support", Port: "USB-C" },
  },
  {
    slug: "samsung-galaxy-tab-s8-plus",
    name: "Samsung Galaxy Tab S8+ (Grey)",
    brand: "Samsung",
    category: "tablets",
    description: "12.4\" Super AMOLED tablet with an included S Pen — a genuine laptop alternative.",
    mrp: 57900, price: 49900, image: dj("tablets", "samsung-galaxy-tab-s8-plus-grey"),
    rating: 4.7, numReviews: 1340, stock: 62, featured: false,
    specs: { Display: "12.4\" Super AMOLED", Chip: "Snapdragon 8 Gen 1", Storage: "128GB", Pen: "S Pen included", Battery: "10090mAh" },
  },
  {
    slug: "samsung-galaxy-tab",
    name: "Samsung Galaxy Tab (White)",
    brand: "Samsung",
    category: "tablets",
    description: "A crisp, everyday Android tablet for streaming, reading and browsing.",
    mrp: 33900, price: 28900, image: dj("tablets", "samsung-galaxy-tab-white"),
    rating: 4.3, numReviews: 980, stock: 92, featured: false,
    specs: { Display: "10.5\" TFT", RAM: "4GB", Storage: "64GB", Battery: "7040mAh", OS: "Android" },
  },

  // Audio
  {
    slug: "apple-airpods",
    name: "Apple AirPods (2nd gen)",
    brand: "Apple",
    category: "audio",
    description: "Effortless wireless earbuds with the H1 chip, quick pairing and hands-free “Hey Siri”.",
    mrp: 14900, price: 12900, image: dj("mobile-accessories", "apple-airpods"),
    rating: 4.6, numReviews: 8123, stock: 67, featured: true,
    specs: { Type: "In-ear TWS", Chip: "H1", Playback: "24h with case", Charging: "Lightning", Voice: "Hey Siri" },
  },
  {
    slug: "apple-airpods-max",
    name: "Apple AirPods Max (Silver)",
    brand: "Apple",
    category: "audio",
    description: "Over-ear headphones with active noise cancellation, spatial audio and a stunning knit-mesh canopy.",
    mrp: 69900, price: 59900, image: dj("mobile-accessories", "apple-airpods-max-silver"),
    rating: 4.5, numReviews: 3011, stock: 59, featured: false,
    specs: { Type: "Over-ear", ANC: "Active", Audio: "Spatial", Playback: "20h", Drivers: "40mm" },
  },
  {
    slug: "beats-flex",
    name: "Beats Flex Wireless Earphones",
    brand: "Beats",
    category: "audio",
    description: "All-day wireless earphones with Apple W1, magnetic earbuds and Auto-Play/Pause.",
    mrp: 5900, price: 4999, image: dj("mobile-accessories", "beats-flex-wireless-earphones"),
    rating: 4.3, numReviews: 4520, stock: 50, featured: false,
    specs: { Type: "Neckband", Chip: "Apple W1", Playback: "12h", Charging: "USB-C fast", Magnetic: "Yes" },
  },
  {
    slug: "amazon-echo-plus",
    name: "Amazon Echo Plus (Smart Speaker)",
    brand: "Amazon",
    category: "audio",
    description: "Room-filling sound with Alexa and a built-in smart-home hub to control your devices.",
    mrp: 10900, price: 8999, image: dj("mobile-accessories", "amazon-echo-plus"),
    rating: 4.6, numReviews: 6210, stock: 61, featured: false,
    specs: { Assistant: "Alexa", Hub: "Zigbee built-in", Audio: "360°", Connectivity: "Wi-Fi, BT", Mics: "7 far-field" },
  },
  {
    slug: "homepod-mini",
    name: "Apple HomePod mini (Space Grey)",
    brand: "Apple",
    category: "audio",
    description: "Big, room-filling sound from a compact smart speaker with Siri and a smart-home hub.",
    mrp: 11900, price: 9900, image: dj("mobile-accessories", "apple-homepod-mini-cosmic-grey"),
    rating: 4.5, numReviews: 2740, stock: 27, featured: false,
    specs: { Assistant: "Siri", Audio: "360° computational", Hub: "Thread/Matter", Connectivity: "Wi-Fi, BT", Height: "84.3mm" },
  },

  // Wearables
  {
    slug: "apple-watch-series-4",
    name: "Apple Watch Series 4 (GPS, Gold)",
    brand: "Apple",
    category: "wearables",
    description: "Larger edge-to-edge Retina display, ECG and fall detection in a refined stainless design.",
    mrp: 29900, price: 24900, image: dj("mobile-accessories", "apple-watch-series-4-gold"),
    rating: 4.5, numReviews: 6210, stock: 33, featured: true,
    specs: { Display: "Retina LTPO OLED", Health: "ECG, fall detection", GPS: "Built-in", Water: "50m", Battery: "18h" },
  },
  {
    slug: "longines-master",
    name: "Longines Master Collection Automatic",
    brand: "Longines",
    category: "wearables",
    description: "A Swiss automatic dress watch with a self-winding movement, sapphire crystal and leather strap.",
    mrp: 219900, price: 189900, image: dj("mens-watches", "longines-master-collection"),
    rating: 4.6, numReviews: 210, stock: 20, featured: false,
    specs: { Movement: "Automatic", Crystal: "Sapphire", Case: "Stainless steel", Water: "30m", Strap: "Leather" },
  },
  {
    slug: "brown-leather-watch",
    name: "Classic Brown Leather Watch",
    brand: "Timepieces",
    category: "wearables",
    description: "A minimalist everyday watch with a clean dial and genuine brown leather strap.",
    mrp: 5900, price: 3999, image: dj("mens-watches", "brown-leather-belt-watch"),
    rating: 4.2, numReviews: 640, stock: 32, featured: false,
    specs: { Movement: "Quartz", Case: "Alloy", Strap: "Leather", Water: "3ATM", Dial: "Analog" },
  },

  // Accessories
  {
    slug: "iphone-charger",
    name: "Apple 20W USB-C Power Adapter",
    brand: "Apple",
    category: "accessories",
    description: "Fast, compact USB-C charger — refuel your iPhone or iPad quickly and reliably.",
    mrp: 2900, price: 1999, image: dj("mobile-accessories", "apple-iphone-charger"),
    rating: 4.5, numReviews: 5140, stock: 120, featured: false,
    specs: { Output: "20W", Port: "USB-C", Compatible: "iPhone / iPad", Safety: "Over-current protection" },
  },
  {
    slug: "magsafe-battery-pack",
    name: "Apple MagSafe Battery Pack",
    brand: "Apple",
    category: "accessories",
    description: "Snap-on wireless battery that magnetically aligns to give your iPhone extra hours on the go.",
    mrp: 10900, price: 8900, image: dj("mobile-accessories", "apple-magsafe-battery-pack"),
    rating: 4.2, numReviews: 3320, stock: 45, featured: false,
    specs: { Attach: "MagSafe", Charging: "Wireless", Port: "Lightning passthrough", For: "iPhone 12 and later" },
  },
  {
    slug: "iphone-12-silicone-case",
    name: "iPhone 12 Silicone Case with MagSafe (Plum)",
    brand: "Apple",
    category: "accessories",
    description: "Soft-touch silicone case with a microfiber lining and built-in MagSafe magnets.",
    mrp: 3900, price: 2499, image: dj("mobile-accessories", "iphone-12-silicone-case-with-magsafe-plum"),
    rating: 4.4, numReviews: 2610, stock: 90, featured: false,
    specs: { Material: "Silicone", MagSafe: "Yes", Lining: "Microfiber", For: "iPhone 12 / 12 Pro" },
  },
  {
    slug: "airpower-wireless-charger",
    name: "Wireless Charging Pad",
    brand: "Volt",
    category: "accessories",
    description: "Flat Qi charging pad — set your phone or earbuds down to charge, no cables to fumble.",
    mrp: 7900, price: 5900, image: dj("mobile-accessories", "apple-airpower-wireless-charger"),
    rating: 4.1, numReviews: 1870, stock: 60, featured: false,
    specs: { Standard: "Qi", Output: "15W", Surface: "Non-slip", Indicator: "LED" },
  },
];

/*
 * Bulk-pricing defaults — every product should be buyable wholesale, so we derive
 * sensible volume tiers + a wholesale price from the retail price using
 * category-appropriate quantities. Hand-tuned products (with priceTiers) and the
 * NO_BULK set are left untouched.
 */
const BULK_QTYS: Record<string, [number, number]> = {
  smartphones: [5, 10],
  laptops: [3, 10],
  tablets: [5, 10],
  audio: [5, 20],
  wearables: [5, 20],
  accessories: [10, 50],
};

// Halo / limited items we deliberately DON'T offer wholesale.
const NO_BULK = new Set(["macbook-pro-14", "longines-master"]);

function applyBulkDefaults(p: Product): Product {
  if (p.priceTiers && p.priceTiers.length > 0) return p; // keep hand-tuned
  if (NO_BULK.has(p.slug)) return p; // retail-only
  const [a, b] = BULK_QTYS[p.category] ?? [5, 20];
  const round = (n: number) => Math.round(n);
  return {
    ...p,
    priceTiers: [
      { minQty: a, unitPrice: round(p.price * 0.96) },
      { minQty: b, unitPrice: round(p.price * 0.92) },
    ],
    wholesale: { enabled: true, unitPrice: round(p.price * 0.86), moq: b, tiers: [] },
  };
}

/** Stamp each product with its vendor (by slug), or leave it a house product. */
function applyVendor(p: Product): Product {
  const vendorSlug = VENDOR_OF[p.slug] ?? "";
  const vendorName = vendors.find((v) => v.slug === vendorSlug)?.name ?? "";
  return { ...p, vendorSlug, vendorName };
}

export const products: Product[] = rawProducts
  .map(applyBulkDefaults)
  .map(applyVendor);

export const coupons: Coupon[] = [
  { code: "SAVE500", type: "flat", value: 500, minSubtotal: 5000, maxDiscount: 0, active: true, description: "₹500 off on orders over ₹5,000" },
  { code: "SAVE1000", type: "flat", value: 1000, minSubtotal: 10000, maxDiscount: 0, active: true, description: "₹1,000 off on orders over ₹10,000" },
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 2000, maxDiscount: 1500, active: true, description: "10% off (up to ₹1,500) on orders over ₹2,000" },
  { code: "FLAT200", type: "flat", value: 200, minSubtotal: 1500, maxDiscount: 0, active: true, description: "₹200 off on orders over ₹1,500" },
];
