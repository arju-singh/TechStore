import mongoose, { Schema, model, models } from "mongoose";

const TemplateLineSchema = new Schema(
  { slug: { type: String, required: true }, qty: { type: Number, required: true } },
  { _id: false }
);

/** A saved bulk-order template (a named list of slug+qty) for quick reordering. */
const OrderTemplateSchema = new Schema(
  {
    wholesalerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    lines: { type: [TemplateLineSchema], default: [] },
  },
  { timestamps: true }
);

export const OrderTemplateModel =
  models.OrderTemplate || model("OrderTemplate", OrderTemplateSchema);
export default OrderTemplateModel;
export type OrderTemplateDocument = mongoose.InferSchemaType<
  typeof OrderTemplateSchema
>;
