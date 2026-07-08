import mongoose, { Schema, model, models } from "mongoose";

/**
 * A Request For Quote: a wholesaler asks a vendor for custom pricing on a bulk
 * order (typically beyond the largest published tier). The vendor accepts,
 * rejects, or counters; an accepted RFQ converts into a wholesale order at the
 * agreed price. DB-only (see lib/rfqs.ts).
 */
const WholesaleRfqSchema = new Schema(
  {
    wholesalerId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true }, // buyer's user id (for notifications)
    businessName: { type: String, default: "" },
    vendorSlug: { type: String, default: "", index: true }, // "" = house product
    productSlug: { type: String, required: true },
    productName: { type: String, required: true },
    requestedQty: { type: Number, required: true },
    proposedPrice: { type: Number, default: 0 }, // per-unit price the buyer proposes
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered"],
      default: "pending",
      index: true,
    },
    vendorCounterPrice: { type: Number, default: 0 }, // per-unit the vendor offers
    vendorNote: { type: String, default: "" },
    // The per-unit price the wholesaler can order at once accepted/countered.
    agreedPrice: { type: Number, default: 0 },
    convertedOrderId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const WholesaleRfqModel =
  models.WholesaleRfq || model("WholesaleRfq", WholesaleRfqSchema);
export default WholesaleRfqModel;
export type WholesaleRfqDocument = mongoose.InferSchemaType<
  typeof WholesaleRfqSchema
>;
