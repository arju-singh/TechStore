import mongoose, { Schema, model, models } from "mongoose";

/**
 * A wholesaler's business address (billing / warehouse). Embedded, no _id.
 */
const WholesaleAddressSchema = new Schema(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

/**
 * Metadata for an uploaded verification document. Only metadata is stored here;
 * the binary lives on Cloudinary (private/authenticated) in production, or on
 * local disk under WHOLESALE_UPLOAD_DIR in dev — see `storage`.
 */
const WholesaleDocumentSchema = new Schema(
  {
    docType: { type: String, required: true }, // gst_certificate | business_license | id_proof | ...
    originalName: { type: String, required: true },
    storedName: { type: String, required: true }, // disk filename OR Cloudinary public id
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: String, required: true },
    // Where the bytes live. Legacy records (absent) → disk.
    storage: { type: String, enum: ["disk", "cloudinary"], default: "disk" },
    resourceType: { type: String }, // Cloudinary: "image" | "raw"
    format: { type: String }, // Cloudinary: extension
  },
  { _id: true }
);

/**
 * The WHOLESALER role, modeled as a distinct entity owned by exactly one user
 * (like a Vendor). A user "is a wholesaler" only when they own a profile whose
 * status is APPROVED. This is a true role, not a flag on a customer account.
 *
 * DB-only by design: there is NO in-memory fallback for this collection. All
 * access goes through lib/wholesalers.ts, which calls requireDatabase() first.
 */
const WholesalerProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },

    // Business verification (section 1)
    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    taxNumber: { type: String, required: true }, // GST/tax registration number
    tradeLicenseNumber: { type: String, default: "" },
    businessType: {
      type: String,
      enum: [
        "pet_shop",
        "distributor",
        "breeder",
        "veterinary_clinic",
        "ngo",
        "supermarket",
        "wholesaler",
        "retail_shop",
        "importer",
        "exporter",
        "other",
      ],
      required: true,
    },
    businessAddress: { type: WholesaleAddressSchema, default: () => ({}) },
    warehouseAddress: { type: WholesaleAddressSchema, default: () => ({}) },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    website: { type: String, default: "" },
    expectedMonthlyPurchase: { type: Number, default: 0 },
    categoriesInterested: { type: [String], default: [] },
    documents: { type: [WholesaleDocumentSchema], default: [] },

    // Lifecycle (section 1 / admin)
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "needs_docs",
        "suspended",
        "blacklisted",
      ],
      default: "pending",
      index: true,
    },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },

    // Extras
    membershipTier: {
      type: String,
      enum: ["none", "silver", "gold", "platinum", "diamond"],
      default: "none",
    },
    loyaltyPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WholesalerProfileModel =
  models.WholesalerProfile ||
  model("WholesalerProfile", WholesalerProfileSchema);
export default WholesalerProfileModel;
export type WholesalerProfileDocument = mongoose.InferSchemaType<
  typeof WholesalerProfileSchema
>;
