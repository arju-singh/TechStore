import mongoose, { Schema, model, models } from "mongoose";

/**
 * A wholesaler's credit line, set by an admin. `currentBalance` is the
 * outstanding amount on Net-terms orders; a new credit order is blocked if it
 * would push the balance past `creditLimit`. DB-only (see lib/creditTerms.ts).
 */
const WholesaleCreditTermSchema = new Schema(
  {
    wholesalerId: { type: String, required: true, unique: true, index: true },
    creditLimit: { type: Number, default: 0 },
    termsDays: { type: Number, default: 30 }, // Net-15 / Net-30
    currentBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WholesaleCreditTermModel =
  models.WholesaleCreditTerm ||
  model("WholesaleCreditTerm", WholesaleCreditTermSchema);
export default WholesaleCreditTermModel;
export type WholesaleCreditTermDocument = mongoose.InferSchemaType<
  typeof WholesaleCreditTermSchema
>;
