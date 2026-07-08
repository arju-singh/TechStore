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
    // NOTE: B2B/wholesale is now a distinct WHOLESALER role modeled as its own
    // entity (lib/models/WholesalerProfile.ts), owned by a user — not fields on
    // the user account. See lib/wholesalers.ts.
  },
  { timestamps: true }
);

export const UserModel = models.User || model("User", UserSchema);
export default UserModel;
export type UserDocument = mongoose.InferSchemaType<typeof UserSchema>;
