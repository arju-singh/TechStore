import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import WholesaleSettingsModel from "@/lib/models/WholesaleSettings";

/** Platform wholesale settings. DB-only, fail-loud. */
export interface WholesaleSettings {
  moduleEnabled: boolean;
  maxDiscountPercent: number;
  wholesaleCommissionPercent: number;
  defaultCreditDays: number;
}

const DEFAULTS: WholesaleSettings = {
  moduleEnabled: true,
  maxDiscountPercent: 60,
  wholesaleCommissionPercent: 8,
  defaultCreditDays: 30,
};

function docToSettings(doc: any): WholesaleSettings {
  return {
    moduleEnabled: doc.moduleEnabled ?? DEFAULTS.moduleEnabled,
    maxDiscountPercent:
      typeof doc.maxDiscountPercent === "number"
        ? doc.maxDiscountPercent
        : DEFAULTS.maxDiscountPercent,
    wholesaleCommissionPercent:
      typeof doc.wholesaleCommissionPercent === "number"
        ? doc.wholesaleCommissionPercent
        : DEFAULTS.wholesaleCommissionPercent,
    defaultCreditDays:
      typeof doc.defaultCreditDays === "number"
        ? doc.defaultCreditDays
        : DEFAULTS.defaultCreditDays,
  };
}

/** Read the singleton, creating it with defaults on first access. */
export async function getWholesaleSettings(): Promise<WholesaleSettings> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleSettingsModel.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global", ...DEFAULTS } },
    { new: true, upsert: true }
  ).lean();
  return docToSettings(doc);
}

export async function updateWholesaleSettings(
  patch: Partial<WholesaleSettings>
): Promise<WholesaleSettings> {
  requireDatabase();
  await connectToDatabase();
  const clean: Record<string, unknown> = {};
  if (typeof patch.moduleEnabled === "boolean")
    clean.moduleEnabled = patch.moduleEnabled;
  if (typeof patch.maxDiscountPercent === "number")
    clean.maxDiscountPercent = patch.maxDiscountPercent;
  if (typeof patch.wholesaleCommissionPercent === "number")
    clean.wholesaleCommissionPercent = patch.wholesaleCommissionPercent;
  if (typeof patch.defaultCreditDays === "number")
    clean.defaultCreditDays = patch.defaultCreditDays;
  const doc = await WholesaleSettingsModel.findOneAndUpdate(
    { key: "global" },
    { $set: clean, $setOnInsert: { key: "global" } },
    { new: true, upsert: true }
  ).lean();
  return docToSettings(doc);
}

/** Guard for wholesale routes: throws a clear error if the module is disabled. */
export async function assertWholesaleEnabled(): Promise<WholesaleSettings> {
  const settings = await getWholesaleSettings();
  if (!settings.moduleEnabled) {
    throw new Error("The wholesale module is currently disabled.");
  }
  return settings;
}
