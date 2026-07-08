import mongoose, { Schema, model, models } from "mongoose";

/**
 * A real, persisted user notification. Written on wholesale lifecycle events
 * (application submitted/approved/rejected, RFQ responses, order events). Shown
 * in-app; optionally also delivered by email when a provider is configured.
 * DB-only (see lib/notifications.ts) — never a placeholder.
 */
const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    read: { type: Boolean, default: false },
    // "in_app" always; "email" recorded when an email was really dispatched.
    emailStatus: {
      type: String,
      enum: ["skipped", "sent", "failed"],
      default: "skipped",
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const NotificationModel =
  models.Notification || model("Notification", NotificationSchema);
export default NotificationModel;
export type NotificationDocument = mongoose.InferSchemaType<
  typeof NotificationSchema
>;
