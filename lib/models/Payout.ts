import mongoose, { Schema, model, models } from "mongoose";

/**
 * A payout record: a batch of money the platform has paid (or owes) a vendor.
 * The vendor's *payable* balance is derived — net earnings from settled orders
 * minus the sum of `paid` payouts — so this collection is the ledger of what has
 * actually been disbursed. Accounting only; no real bank transfer happens here.
 */
const PayoutSchema = new Schema(
  {
    // Linked by vendor slug, matching how products/order-items reference a vendor.
    vendorSlug: { type: String, required: true, index: true },
    vendorName: { type: String, default: "" },
    amount: { type: Number, required: true },
    // Orders included in this payout batch (for the vendor's records).
    orderIds: { type: [String], default: [] },
    status: { type: String, enum: ["pending", "paid"], default: "paid" },
    note: { type: String, default: "" },
    paidAt: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PayoutModel = models.Payout || model("Payout", PayoutSchema);
export default PayoutModel;
export type PayoutDocument = mongoose.InferSchemaType<typeof PayoutSchema>;
