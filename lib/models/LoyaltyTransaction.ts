import mongoose, { Schema, model, models } from "mongoose";

/** A single change to a wholesaler's reward-points balance (an audit ledger). */
const LoyaltyTransactionSchema = new Schema(
  {
    wholesalerId: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    reason: { type: String, default: "" },
    orderId: { type: String, default: "" },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

export const LoyaltyTransactionModel =
  models.LoyaltyTransaction ||
  model("LoyaltyTransaction", LoyaltyTransactionSchema);
export default LoyaltyTransactionModel;
export type LoyaltyTransactionDocument = mongoose.InferSchemaType<
  typeof LoyaltyTransactionSchema
>;
