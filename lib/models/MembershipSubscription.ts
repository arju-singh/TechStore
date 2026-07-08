import mongoose, { Schema, model, models } from "mongoose";

/**
 * A wholesaler's membership subscription. Records the chosen tier + renewal;
 * real recurring billing is out of scope. DB-only (see lib/memberships.ts).
 */
const MembershipSubscriptionSchema = new Schema(
  {
    wholesalerId: { type: String, required: true, unique: true, index: true },
    tier: {
      type: String,
      enum: ["none", "silver", "gold", "platinum", "diamond"],
      default: "none",
    },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    startedAt: { type: String, default: "" },
    renewsAt: { type: String, default: "" },
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MembershipSubscriptionModel =
  models.MembershipSubscription ||
  model("MembershipSubscription", MembershipSubscriptionSchema);
export default MembershipSubscriptionModel;
export type MembershipSubscriptionDocument = mongoose.InferSchemaType<
  typeof MembershipSubscriptionSchema
>;
