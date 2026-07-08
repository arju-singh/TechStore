import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    // Retail vs wholesale buyer. Orthogonal to `role` (admin).
    accountType: { type: String, enum: ["retail", "wholesale"], default: "retail" },
    // Lifecycle of the wholesale application.
    wholesaleStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    // Business details captured on the wholesale application (no GST logic).
    companyName: { type: String, default: "" },
    gstin: { type: String, default: "" },
    businessPhone: { type: String, default: "" },
  },
  { timestamps: true }
);

export const UserModel = models.User || model("User", UserSchema);
export default UserModel;
export type UserDocument = mongoose.InferSchemaType<typeof UserSchema>;
