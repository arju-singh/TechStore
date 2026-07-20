import mongoose, { Schema, model, models } from "mongoose";

/**
 * A customer product review. Written by a signed-in user against a product slug.
 * `verifiedPurchase` is stamped at write time from the user's real order history
 * (never client-supplied). Reviews are published immediately for a responsive UX;
 * an admin can `hidden` them via the moderation queue. One review per user per
 * product (enforced by the compound unique index).
 */
const ReviewSchema = new Schema(
  {
    productSlug: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
      index: true,
    },
    verifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One review per (product, user). Also the query index for "did this user
// already review this product?".
ReviewSchema.index({ productSlug: 1, userId: 1 }, { unique: true });

export const ReviewModel = models.Review || model("Review", ReviewSchema);
export default ReviewModel;
export type ReviewDocument = mongoose.InferSchemaType<typeof ReviewSchema>;
