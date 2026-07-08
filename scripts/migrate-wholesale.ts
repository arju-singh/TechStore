/**
 * One-off migration: move the old `accountType:"wholesale"` B2B model onto the
 * new distinct WHOLESALER role (WholesalerProfile). Idempotent and a no-op when
 * there are no legacy wholesale users.
 *
 * Usage:  npm run migrate:wholesale   (requires MONGODB_URI)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import WholesalerProfileModel from "../lib/models/WholesalerProfile";

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

function mapStatus(legacy: string): string {
  if (legacy === "approved") return "approved";
  if (legacy === "rejected") return "rejected";
  return "pending";
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "\n✖ MONGODB_URI is not set. This migration requires a database.\n"
    );
    process.exit(1);
  }

  console.log("→ Connecting to MongoDB…");
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // Read raw user docs still carrying the legacy wholesale fields.
  const legacy = await db
    .collection("users")
    .find({ accountType: "wholesale" })
    .toArray();
  console.log(`→ Found ${legacy.length} legacy wholesale user(s).`);

  let created = 0;
  let skipped = 0;
  for (const u of legacy) {
    const userId = String(u._id);
    const existing = await WholesalerProfileModel.findOne({ userId });
    if (existing) {
      skipped += 1;
      continue;
    }
    const status = mapStatus(u.wholesaleStatus);
    await WholesalerProfileModel.create({
      userId,
      businessName: u.companyName || u.name || "Wholesaler",
      ownerName: u.name || "Owner",
      taxNumber: u.gstin || "PENDING-MIGRATION",
      businessType: "other",
      email: u.email || "",
      phone: u.businessPhone || "0000000000",
      status,
      approvedAt: status === "approved" ? new Date().toISOString() : "",
    });
    created += 1;
  }

  // Drop the legacy fields from all user docs (they no longer belong on User).
  const res = await db.collection("users").updateMany(
    {},
    {
      $unset: {
        accountType: "",
        wholesaleStatus: "",
        companyName: "",
        gstin: "",
        businessPhone: "",
      },
    }
  );

  console.log(
    `\n✔ Migration complete. Profiles created: ${created}, skipped (already migrated): ${skipped}. Legacy fields stripped from ${res.modifiedCount} user doc(s).\n`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\n✖ Migration failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
