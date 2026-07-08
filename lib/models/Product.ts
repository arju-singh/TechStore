import mongoose, { Schema, model, models } from "mongoose";

const PriceTierSchema = new Schema(
  {
    minQty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const WholesaleTierSchema = new Schema(
  {
    minQty: { type: Number, required: true },
    maxQty: { type: Number, default: null }, // null = open-ended (highest band)
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const WholesaleSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    unitPrice: { type: Number, default: 0 }, // legacy single contract rate
    moq: { type: Number, default: 1 },
    // Modern B2B quantity bands, vendor-set, capped by admin max discount.
    tiers: { type: [WholesaleTierSchema], default: [] },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    mrp: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    specs: { type: Map, of: String, default: {} },
    // Public quantity breaks (visible to everyone).
    priceTiers: { type: [PriceTierSchema], default: [] },
    // Approved-wholesaler-only contract pricing.
    wholesale: { type: WholesaleSchema, default: () => ({ enabled: false, unitPrice: 0, moq: 1 }) },
    // GST rate (%) — prices are GST-inclusive.
    gstRate: { type: Number, default: 18 },
    // Marketplace: the vendor selling this SKU. "" = sold by TechStore (house).
    // Linked by slug so it's stable across seed / in-memory / Mongo (no _id needed).
    vendorSlug: { type: String, default: "", index: true },
    vendorName: { type: String, default: "" },
  },
  { timestamps: true }
);

// Text index powers keyword search when a database is connected.
ProductSchema.index({ name: "text", brand: "text", description: "text" });

export const ProductModel = models.Product || model("Product", ProductSchema);
export default ProductModel;
export type ProductDocument = mongoose.InferSchemaType<typeof ProductSchema>;
