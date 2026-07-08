import mongoose, { Schema, model, models } from "mongoose";

const PriceTierSchema = new Schema(
  {
    minQty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const WholesaleSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    unitPrice: { type: Number, default: 0 },
    moq: { type: Number, default: 1 },
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
  },
  { timestamps: true }
);

// Text index powers keyword search when a database is connected.
ProductSchema.index({ name: "text", brand: "text", description: "text" });

export const ProductModel = models.Product || model("Product", ProductSchema);
export default ProductModel;
export type ProductDocument = mongoose.InferSchemaType<typeof ProductSchema>;
