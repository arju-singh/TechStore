import mongoose, { Schema, model, models } from "mongoose";

const OrderItemSchema = new Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    qty: { type: Number, required: true },
    // GST rate (%) snapshot for the tax invoice. Prices are GST-inclusive.
    gstRate: { type: Number, default: 18 },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    user: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    address: { type: AddressSchema, required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cod", "razorpay", "credit", "quote"],
      default: "cod",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "quote_requested",
        "quoted",
        "credit_invoiced",
      ],
      default: "confirmed",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    // B2B: purchase-order reference and Net-30 credit due date.
    poNumber: { type: String, default: "" },
    creditDueDate: { type: String, default: "" },
    // B2B quote response: the price an admin quoted, and an optional note.
    quotedTotal: { type: Number, default: 0 },
    quoteNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export const OrderModel = models.Order || model("Order", OrderSchema);
export default OrderModel;
