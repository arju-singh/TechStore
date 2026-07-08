import type { Category, Product } from "@/lib/types";
import type { Coupon } from "@/lib/coupons";

/**
 * Local sample catalog. This is the single source of truth for `npm run seed`
 * (which pushes it into MongoDB) AND the fallback the storefront renders from
 * when no MONGODB_URI is configured. Images use picsum.photos seeded URLs so
 * they are deterministic and need no API key.
 */

const img = (seed: string) => `https://picsum.photos/seed/${seed}/700/700`;

export const categories: Category[] = [
  { slug: "smartphones", name: "Smartphones", tagline: "Flagship to budget, all unlocked", image: img("cat-phones") },
  { slug: "laptops", name: "Laptops", tagline: "Ultrabooks, gaming & work machines", image: img("cat-laptops") },
  { slug: "audio", name: "Audio", tagline: "Headphones, earbuds & speakers", image: img("cat-audio") },
  { slug: "wearables", name: "Wearables", tagline: "Smartwatches & fitness bands", image: img("cat-wearables") },
  { slug: "cameras", name: "Cameras", tagline: "Mirrorless, action & instant", image: img("cat-cameras") },
  { slug: "accessories", name: "Accessories", tagline: "Chargers, cables & more", image: img("cat-accessories") },
];

const rawProducts: Product[] = [
  // Smartphones
  {
    slug: "aurora-x5-pro",
    name: "Aurora X5 Pro 5G (256GB)",
    brand: "Aurora",
    category: "smartphones",
    description:
      "Flagship 6.7\" LTPO AMOLED display with 120Hz refresh, a 50MP triple camera and all-day 5000mAh battery with 68W fast charging.",
    mrp: 79999,
    price: 64999,
    image: img("aurora-x5-pro"),
    rating: 4.6,
    numReviews: 2143,
    stock: 24,
    featured: true,
    specs: { Display: "6.7\" LTPO AMOLED 120Hz", Chipset: "Snapdragon 8 Gen 3", RAM: "12GB", Storage: "256GB", Battery: "5000mAh, 68W", Camera: "50MP + 12MP + 8MP" },
  },
  {
    slug: "nova-lite-4g",
    name: "Nova Lite (128GB)",
    brand: "Nova",
    category: "smartphones",
    description:
      "Everyday performer with a crisp 6.5\" 90Hz display, dependable 5000mAh battery and a clean, bloat-free software experience.",
    mrp: 16999,
    price: 12499,
    image: img("nova-lite-4g"),
    rating: 4.2,
    numReviews: 5821,
    stock: 60,
    featured: false,
    specs: { Display: "6.5\" IPS 90Hz", Chipset: "Helio G99", RAM: "6GB", Storage: "128GB", Battery: "5000mAh, 18W", Camera: "50MP + 2MP" },
    priceTiers: [
      { minQty: 5, unitPrice: 11999 },
      { minQty: 10, unitPrice: 11499 },
    ],
    wholesale: { enabled: true, unitPrice: 10499, moq: 10 },
  },
  {
    slug: "pulse-fold-z",
    name: "Pulse Fold Z (512GB)",
    brand: "Pulse",
    category: "smartphones",
    description:
      "Foldable 7.6\" main display that slips into your pocket. Multitask like a tablet, call like a phone.",
    mrp: 149999,
    price: 134999,
    image: img("pulse-fold-z"),
    rating: 4.4,
    numReviews: 612,
    stock: 8,
    featured: true,
    specs: { Display: "7.6\" Foldable AMOLED", Chipset: "Snapdragon 8 Gen 3", RAM: "12GB", Storage: "512GB", Battery: "4400mAh, 25W", Camera: "50MP + 12MP + 10MP" },
  },
  {
    slug: "aurora-a3",
    name: "Aurora A3 (128GB)",
    brand: "Aurora",
    category: "smartphones",
    description:
      "Sleek mid-ranger with a 64MP OIS camera and 33W charging that tops up in a hurry.",
    mrp: 24999,
    price: 19999,
    image: img("aurora-a3"),
    rating: 4.3,
    numReviews: 3390,
    stock: 41,
    featured: false,
    specs: { Display: "6.4\" AMOLED 90Hz", Chipset: "Dimensity 7200", RAM: "8GB", Storage: "128GB", Battery: "4800mAh, 33W", Camera: "64MP OIS + 8MP" },
  },

  // Laptops
  {
    slug: "zenbook-air-14",
    name: "ZenBook Air 14 (M-series, 512GB)",
    brand: "ZenBook",
    category: "laptops",
    description:
      "Featherweight 1.1kg ultrabook with a stunning 14\" OLED panel and 18-hour battery for all-day work anywhere.",
    mrp: 114999,
    price: 99999,
    image: img("zenbook-air-14"),
    rating: 4.7,
    numReviews: 1287,
    stock: 15,
    featured: true,
    specs: { Display: "14\" 2.8K OLED", CPU: "10-core", RAM: "16GB", Storage: "512GB SSD", Weight: "1.1kg", Battery: "Up to 18h" },
  },
  {
    slug: "raptor-15-gaming",
    name: "Raptor 15 Gaming Laptop (RTX, 1TB)",
    brand: "Raptor",
    category: "laptops",
    description:
      "165Hz display, ray-tracing GPU and a vapor-chamber cooling system built for serious frame rates.",
    mrp: 179999,
    price: 154999,
    image: img("raptor-15-gaming"),
    rating: 4.5,
    numReviews: 934,
    stock: 12,
    featured: true,
    specs: { Display: "15.6\" QHD 165Hz", CPU: "8-core", GPU: "RTX 4060 8GB", RAM: "16GB", Storage: "1TB SSD", Cooling: "Vapor chamber" },
  },
  {
    slug: "workbook-pro-16",
    name: "WorkBook Pro 16 (1TB)",
    brand: "WorkBook",
    category: "laptops",
    description:
      "Creator-grade 16\" mini-LED display with a 100% DCI-P3 gamut, perfect for photo and video editing.",
    mrp: 199999,
    price: 184999,
    image: img("workbook-pro-16"),
    rating: 4.8,
    numReviews: 421,
    stock: 9,
    featured: false,
    specs: { Display: "16\" Mini-LED 120Hz", CPU: "12-core", RAM: "32GB", Storage: "1TB SSD", Ports: "3x USB-C, HDMI, SD", Battery: "Up to 21h" },
  },
  {
    slug: "everyday-14-chrome",
    name: "Everyday 14 Cloudbook",
    brand: "Everyday",
    category: "laptops",
    description:
      "Snappy, affordable and secure — ideal for browsing, streaming and study. Boots in seconds.",
    mrp: 32999,
    price: 24999,
    image: img("everyday-14-chrome"),
    rating: 4.1,
    numReviews: 2765,
    stock: 50,
    featured: false,
    specs: { Display: "14\" FHD IPS", CPU: "Quad-core", RAM: "8GB", Storage: "128GB eMMC", Weight: "1.4kg", Battery: "Up to 12h" },
  },

  // Audio
  {
    slug: "echo-buds-pro",
    name: "Echo Buds Pro (ANC)",
    brand: "Echo",
    category: "audio",
    description:
      "Adaptive active noise cancellation, spatial audio and 30 hours of total playback with the charging case.",
    mrp: 14999,
    price: 8999,
    image: img("echo-buds-pro"),
    rating: 4.4,
    numReviews: 8123,
    stock: 120,
    featured: true,
    specs: { Type: "In-ear TWS", ANC: "Adaptive", Playback: "30h with case", Water: "IPX4", Codec: "AAC, LDAC" },
    priceTiers: [
      { minQty: 5, unitPrice: 8499 },
      { minQty: 20, unitPrice: 7999 },
    ],
    wholesale: { enabled: true, unitPrice: 7299, moq: 20 },
  },
  {
    slug: "studio-over-ear-500",
    name: "Studio Over-Ear 500",
    brand: "Studio",
    category: "audio",
    description:
      "Plush over-ear headphones with 40mm drivers, 40-hour battery and best-in-class noise cancellation for travel.",
    mrp: 29999,
    price: 22999,
    image: img("studio-over-ear-500"),
    rating: 4.6,
    numReviews: 3011,
    stock: 34,
    featured: false,
    specs: { Type: "Over-ear", ANC: "Hybrid", Playback: "40h", Drivers: "40mm", Connectivity: "BT 5.3, 3.5mm" },
  },
  {
    slug: "boom-portable-speaker",
    name: "Boom Portable Speaker",
    brand: "Boom",
    category: "audio",
    description:
      "Rugged, waterproof 360° speaker with punchy bass and 24-hour battery. Pairs two for stereo.",
    mrp: 9999,
    price: 6499,
    image: img("boom-portable-speaker"),
    rating: 4.3,
    numReviews: 4520,
    stock: 78,
    featured: false,
    specs: { Output: "30W", Water: "IP67", Playback: "24h", Pairing: "Stereo TWS", Weight: "560g" },
  },

  // Wearables
  {
    slug: "pace-watch-2",
    name: "Pace Watch 2 (GPS)",
    brand: "Pace",
    category: "wearables",
    description:
      "AMOLED smartwatch with built-in GPS, SpO2, 100+ sport modes and a 14-day battery.",
    mrp: 19999,
    price: 14999,
    image: img("pace-watch-2"),
    rating: 4.5,
    numReviews: 6210,
    stock: 46,
    featured: true,
    specs: { Display: "1.43\" AMOLED", GPS: "Built-in", Battery: "Up to 14 days", Water: "5ATM", Sensors: "HR, SpO2, sleep" },
  },
  {
    slug: "fitband-lite",
    name: "FitBand Lite",
    brand: "Fit",
    category: "wearables",
    description:
      "Slim fitness tracker with heart-rate, sleep tracking and a two-week battery. Your everyday health companion.",
    mrp: 4999,
    price: 2999,
    image: img("fitband-lite"),
    rating: 4.2,
    numReviews: 9840,
    stock: 200,
    featured: false,
    specs: { Display: "1.1\" AMOLED", Battery: "14 days", Water: "5ATM", Sensors: "HR, sleep, steps", Weight: "24g" },
    priceTiers: [
      { minQty: 10, unitPrice: 2699 },
      { minQty: 25, unitPrice: 2499 },
    ],
    wholesale: { enabled: true, unitPrice: 2199, moq: 25 },
  },

  // Cameras
  {
    slug: "lumina-m50-mirrorless",
    name: "Lumina M50 Mirrorless (Kit)",
    brand: "Lumina",
    category: "cameras",
    description:
      "24MP APS-C mirrorless with 4K video, in-body stabilization and a flip-out touchscreen. Ships with 15-45mm lens.",
    mrp: 74999,
    price: 62999,
    image: img("lumina-m50-mirrorless"),
    rating: 4.7,
    numReviews: 1180,
    stock: 18,
    featured: true,
    specs: { Sensor: "24MP APS-C", Video: "4K30", Stabilization: "In-body", Screen: "Flip-out touch", Lens: "15-45mm kit" },
  },
  {
    slug: "actioncam-go-4k",
    name: "ActionCam Go 4K",
    brand: "ActionCam",
    category: "cameras",
    description:
      "Pocket-sized, waterproof action camera with 4K60 recording and rock-steady electronic stabilization.",
    mrp: 29999,
    price: 23999,
    image: img("actioncam-go-4k"),
    rating: 4.4,
    numReviews: 2201,
    stock: 37,
    featured: false,
    specs: { Video: "4K60", Stabilization: "Electronic", Water: "10m without case", Screen: "Dual color", Battery: "Swappable" },
  },
  {
    slug: "snap-instant-mini",
    name: "Snap Instant Mini",
    brand: "Snap",
    category: "cameras",
    description:
      "Fun instant camera that prints credit-card-sized photos on the spot. Great for parties and gifting.",
    mrp: 8999,
    price: 5999,
    image: img("snap-instant-mini"),
    rating: 4.3,
    numReviews: 3670,
    stock: 64,
    featured: false,
    specs: { Film: "Instant mini", Lens: "60mm", Flash: "Auto", Power: "2x AA", Modes: "Selfie mirror" },
  },

  // Accessories
  {
    slug: "gan-65w-charger",
    name: "GaN 65W Fast Charger",
    brand: "Volt",
    category: "accessories",
    description:
      "Compact 3-port GaN charger that powers a laptop, phone and earbuds together. Foldable pins.",
    mrp: 3999,
    price: 2499,
    image: img("gan-65w-charger"),
    rating: 4.6,
    numReviews: 5140,
    stock: 300,
    featured: false,
    specs: { Output: "65W", Ports: "2x USB-C, 1x USB-A", Tech: "GaN", Foldable: "Yes", Safety: "Over-current protection" },
    priceTiers: [
      { minQty: 10, unitPrice: 2199 },
      { minQty: 50, unitPrice: 1899 },
    ],
    wholesale: { enabled: true, unitPrice: 1599, moq: 50 },
  },
  {
    slug: "braided-usbc-cable",
    name: "Braided USB-C to USB-C Cable (2m)",
    brand: "Volt",
    category: "accessories",
    description:
      "Tough nylon-braided 100W cable rated for 20,000 bends. Supports fast charge and data.",
    mrp: 1299,
    price: 699,
    image: img("braided-usbc-cable"),
    rating: 4.5,
    numReviews: 7890,
    stock: 500,
    featured: false,
    specs: { Length: "2m", Power: "100W", Data: "480Mbps", Build: "Nylon braided", Durability: "20,000 bends" },
    priceTiers: [
      { minQty: 10, unitPrice: 599 },
      { minQty: 50, unitPrice: 499 },
      { minQty: 100, unitPrice: 429 },
    ],
    wholesale: { enabled: true, unitPrice: 379, moq: 100 },
  },
  {
    slug: "powerbank-20000",
    name: "PowerBank 20000mAh (22.5W)",
    brand: "Volt",
    category: "accessories",
    description:
      "High-capacity power bank with fast charging and a digital battery display. Charges most phones 4+ times.",
    mrp: 4499,
    price: 2999,
    image: img("powerbank-20000"),
    rating: 4.4,
    numReviews: 6320,
    stock: 150,
    featured: true,
    specs: { Capacity: "20000mAh", Output: "22.5W", Ports: "USB-C + 2x USB-A", Display: "Digital %", Weight: "360g" },
    priceTiers: [
      { minQty: 10, unitPrice: 2699 },
      { minQty: 50, unitPrice: 2399 },
    ],
    wholesale: { enabled: true, unitPrice: 2099, moq: 50 },
  },
];

/*
 * Bulk-pricing defaults. Every product should be buyable wholesale, but only a
 * handful are hand-tuned above. For the rest we derive sensible volume tiers and
 * a wholesale price from the retail price, using category-appropriate quantities
 * (you buy phones by the ten, cables by the hundred). Hand-tuned products (those
 * that already define priceTiers) are left untouched.
 */
const BULK_QTYS: Record<string, [number, number]> = {
  smartphones: [5, 10],
  laptops: [3, 10],
  audio: [5, 20],
  wearables: [10, 25],
  cameras: [3, 10],
  accessories: [10, 50],
};

// Halo / limited-stock flagships we deliberately DON'T offer wholesale — keeps
// the "Bulk & wholesale" filter meaningful (not every SKU qualifies).
const NO_BULK = new Set(["pulse-fold-z", "workbook-pro-16"]);

function applyBulkDefaults(p: Product): Product {
  if (p.priceTiers && p.priceTiers.length > 0) return p; // keep hand-tuned
  if (NO_BULK.has(p.slug)) return p; // retail-only flagship
  const [a, b] = BULK_QTYS[p.category] ?? [5, 20];
  const round = (n: number) => Math.round(n);
  return {
    ...p,
    priceTiers: [
      { minQty: a, unitPrice: round(p.price * 0.96) }, // ~4% off
      { minQty: b, unitPrice: round(p.price * 0.92) }, // ~8% off
    ],
    wholesale: { enabled: true, unitPrice: round(p.price * 0.86), moq: b }, // ~14% off
  };
}

export const products: Product[] = rawProducts.map(applyBulkDefaults);

export const coupons: Coupon[] = [
  {
    code: "SAVE500",
    type: "flat",
    value: 500,
    minSubtotal: 5000,
    maxDiscount: 0,
    active: true,
    description: "₹500 off on orders over ₹5,000",
  },
  {
    code: "SAVE1000",
    type: "flat",
    value: 1000,
    minSubtotal: 10000,
    maxDiscount: 0,
    active: true,
    description: "₹1,000 off on orders over ₹10,000",
  },
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minSubtotal: 2000,
    maxDiscount: 1500,
    active: true,
    description: "10% off (up to ₹1,500) on orders over ₹2,000",
  },
  {
    code: "FLAT200",
    type: "flat",
    value: 200,
    minSubtotal: 1500,
    maxDiscount: 0,
    active: true,
    description: "₹200 off on orders over ₹1,500",
  },
];
