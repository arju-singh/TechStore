import mongoose, { Schema, model, models } from "mongoose";

/**
 * A time-boxed flash sale: while `now` is within [startsAt, endsAt] and the sale
 * is enabled, each listed product is discounted by its `discountPct`. Storing a
 * percentage (rather than an absolute price) keeps the discount valid even if the
 * product's catalog price later changes.
 */
const FlashSaleItemSchema = new Schema(
  {
    slug: { type: String, required: true },
    discountPct: { type: Number, required: true, min: 1, max: 90 },
  },
  { _id: false }
);

const FlashSaleSchema = new Schema(
  {
    title: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    items: { type: [FlashSaleItemSchema], default: [] },
  },
  { timestamps: true }
);

export const FlashSaleModel = models.FlashSale || model("FlashSale", FlashSaleSchema);
export default FlashSaleModel;
export type FlashSaleDocument = mongoose.InferSchemaType<typeof FlashSaleSchema>;
