import mongoose, { Schema, model, models } from "mongoose";

const CategorySchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  tagline: { type: String, default: "" },
  image: { type: String, required: true },
});

export const CategoryModel = models.Category || model("Category", CategorySchema);
export default CategoryModel;
export type CategoryDocument = mongoose.InferSchemaType<typeof CategorySchema>;
