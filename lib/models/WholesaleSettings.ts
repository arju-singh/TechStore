import mongoose, { Schema, model, models } from "mongoose";

/**
 * Platform-wide wholesale settings (a singleton row, keyed "global"). Admin-
 * editable. Governs the whole module: the master on/off toggle, the max discount
 * a vendor's wholesale tier may give (cap), the platform commission on wholesale
 * orders (independent of retail/vendor commission), and default credit days.
 */
const WholesaleSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    moduleEnabled: { type: Boolean, default: true },
    maxDiscountPercent: { type: Number, default: 60 },
    wholesaleCommissionPercent: { type: Number, default: 8 },
    defaultCreditDays: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const WholesaleSettingsModel =
  models.WholesaleSettings ||
  model("WholesaleSettings", WholesaleSettingsSchema);
export default WholesaleSettingsModel;
export type WholesaleSettingsDocument = mongoose.InferSchemaType<
  typeof WholesaleSettingsSchema
>;
