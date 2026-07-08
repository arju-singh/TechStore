import mongoose, { Schema, model, models } from "mongoose";

/**
 * A vendor's pickup / business address. Embedded (no _id) like the order address.
 */
const VendorAddressSchema = new Schema(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
  },
  { _id: false }
);

/**
 * A marketplace vendor (a third-party seller with a storefront). A vendor is
 * owned by exactly one user (`ownerUserId`) who operates it via the vendor
 * portal. Products link to a vendor by `slug` (stable across data paths), and an
 * admin governs the lifecycle via `status`.
 */
const VendorSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    // The user who owns/operates this store. One vendor per owner (enforced in
    // the apply flow). Indexed so getVendorByOwner is cheap.
    ownerUserId: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
      index: true,
    },
    // Platform commission as a percentage of gross sales. null → use the
    // platform default (PLATFORM_COMMISSION_RATE). A per-vendor override wins.
    commissionRate: { type: Number, default: null },
    gstin: { type: String, default: "" },
    address: { type: VendorAddressSchema, default: () => ({}) },
    policies: { type: String, default: "" },
  },
  { timestamps: true }
);

export const VendorModel = models.Vendor || model("Vendor", VendorSchema);
export default VendorModel;
export type VendorDocument = mongoose.InferSchemaType<typeof VendorSchema>;
