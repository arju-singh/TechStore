import mongoose, { Schema, model, models } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    type: { type: String, enum: ["flat", "percent"], required: true },
    value: { type: Number, required: true },
    minSubtotal: { type: Number, default: 0 },
    /** Cap for percentage coupons (0 = no cap). Ignored for flat coupons. */
    maxDiscount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const CouponModel = models.Coupon || model("Coupon", CouponSchema);
export default CouponModel;
