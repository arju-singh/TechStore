/**
 * Seed the MongoDB database with the sample catalog.
 *
 * Usage:  npm run seed
 * Requires MONGODB_URI in .env.local (or the environment).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import ProductModel from "../lib/models/Product";
import CategoryModel from "../lib/models/Category";
import CouponModel from "../lib/models/Coupon";
import VendorModel from "../lib/models/Vendor";
import PayoutModel from "../lib/models/Payout";
import { products, categories, coupons, vendors } from "../data/seed";

// Minimal .env.local loader so we don't need an extra dependency.
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env.local — rely on the ambient environment
  }
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "\n✖ MONGODB_URI is not set.\n" +
        "  Add it to .env.local (see .env.local.example) and try again.\n"
    );
    process.exit(1);
  }

  console.log("→ Connecting to MongoDB…");
  await mongoose.connect(uri);

  console.log("→ Clearing existing products, categories, coupons, vendors & payouts…");
  await ProductModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await CouponModel.deleteMany({});
  await VendorModel.deleteMany({});
  await PayoutModel.deleteMany({});

  console.log(`→ Inserting ${categories.length} categories…`);
  await CategoryModel.insertMany(categories);

  console.log(`→ Inserting ${products.length} products…`);
  await ProductModel.insertMany(products);

  console.log(`→ Inserting ${coupons.length} coupons…`);
  await CouponModel.insertMany(coupons);

  // Strip the seed-only `id`/`createdAt` so Mongo assigns its own _id + timestamps.
  // Products link to vendors by slug, so these ids never need to match the seed.
  const vendorDocs = vendors.map(({ id, createdAt, ...rest }) => rest);
  console.log(`→ Inserting ${vendorDocs.length} vendors…`);
  await VendorModel.insertMany(vendorDocs);

  console.log("\n✔ Seed complete.\n");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\n✖ Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
