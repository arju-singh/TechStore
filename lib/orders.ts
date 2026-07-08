import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import OrderModel from "@/lib/models/Order";

export interface OrderItem {
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  mrp: number;
  qty: number;
  /** GST rate (%) snapshot for the tax invoice. Prices are GST-inclusive. */
  gstRate?: number;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "quote_requested"
  | "quoted"
  | "credit_invoiced";

export type PaymentMethod = "cod" | "razorpay" | "credit" | "quote";

export interface Order {
  id: string;
  user: string;
  items: OrderItem[];
  address: OrderAddress;
  subtotal: number;
  deliveryFee: number;
  couponCode: string;
  couponDiscount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  poNumber: string;
  creditDueDate: string;
  quotedTotal: number;
  quoteNote: string;
  createdAt: string;
}

export interface NewOrderInput {
  user: string;
  items: OrderItem[];
  address: OrderAddress;
  subtotal: number;
  deliveryFee: number;
  couponCode?: string;
  couponDiscount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** COD orders are "confirmed" immediately; online orders start "pending". */
  status: OrderStatus;
  razorpayOrderId?: string;
  poNumber?: string;
  creditDueDate?: string;
}

/*
 * In-memory fallback, mirroring lib/users.ts. Active only when MONGODB_URI is
 * unset; orders live in memory and reset on server restart. For local dev only.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memOrders: Order[] | undefined;
}
const memOrders: Order[] = global._memOrders ?? [];
global._memOrders = memOrders;

let memSeq = memOrders.length;
function nextMemId(): string {
  memSeq += 1;
  // Deterministic, sortable-ish id without Date.now (unavailable in some ctx).
  return `ord_${String(memSeq).padStart(6, "0")}`;
}

function docToOrder(doc: any): Order {
  return {
    id: String(doc._id ?? doc.id),
    user: doc.user,
    items: doc.items,
    address: doc.address,
    subtotal: doc.subtotal,
    deliveryFee: doc.deliveryFee,
    couponCode: doc.couponCode ?? "",
    couponDiscount: doc.couponDiscount ?? 0,
    total: doc.total,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    razorpayOrderId: doc.razorpayOrderId ?? "",
    razorpayPaymentId: doc.razorpayPaymentId ?? "",
    poNumber: doc.poNumber ?? "",
    creditDueDate: doc.creditDueDate ?? "",
    quotedTotal: doc.quotedTotal ?? 0,
    quoteNote: doc.quoteNote ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export async function createOrder(
  input: NewOrderInput,
  createdAtISO: string
): Promise<Order> {
  if (!hasDatabase) {
    const order: Order = {
      id: nextMemId(),
      ...input,
      couponCode: input.couponCode ?? "",
      couponDiscount: input.couponDiscount ?? 0,
      razorpayOrderId: input.razorpayOrderId ?? "",
      razorpayPaymentId: "",
      poNumber: input.poNumber ?? "",
      creditDueDate: input.creditDueDate ?? "",
      quotedTotal: 0,
      quoteNote: "",
      createdAt: createdAtISO,
    };
    memOrders.unshift(order);
    return order;
  }
  await connectToDatabase();
  const doc = await OrderModel.create(input);
  return docToOrder(doc.toObject());
}

/** Attach the Razorpay order id to a pending order right after creating it. */
export async function attachRazorpayOrder(
  id: string,
  razorpayOrderId: string
): Promise<Order | null> {
  if (!hasDatabase) {
    const order = memOrders.find((o) => o.id === id);
    if (!order) return null;
    order.razorpayOrderId = razorpayOrderId;
    return order;
  }
  await connectToDatabase();
  const doc = await OrderModel.findByIdAndUpdate(
    id,
    { razorpayOrderId },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToOrder(doc) : null;
}

/** Mark an order paid after a verified Razorpay payment. */
export async function markOrderPaid(
  id: string,
  razorpayPaymentId: string
): Promise<Order | null> {
  if (!hasDatabase) {
    const order = memOrders.find((o) => o.id === id);
    if (!order) return null;
    order.status = "paid";
    order.razorpayPaymentId = razorpayPaymentId;
    return order;
  }
  await connectToDatabase();
  const doc = await OrderModel.findByIdAndUpdate(
    id,
    { status: "paid", razorpayPaymentId },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToOrder(doc) : null;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  if (!hasDatabase) {
    return memOrders.filter((o) => o.user === userId);
  }
  await connectToDatabase();
  const docs = await OrderModel.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(docToOrder);
}

export async function getAllOrders(): Promise<Order[]> {
  if (!hasDatabase) {
    return [...memOrders];
  }
  await connectToDatabase();
  const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(docToOrder);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  if (!hasDatabase) {
    const order = memOrders.find((o) => o.id === id);
    if (!order) return null;
    order.status = status;
    return order;
  }
  await connectToDatabase();
  const doc = await OrderModel.findByIdAndUpdate(id, { status }, { new: true })
    .lean()
    .catch(() => null);
  return doc ? docToOrder(doc) : null;
}

/**
 * Patch arbitrary order fields (status, total, quote fields, credit due date).
 * Used by the B2B quote loop where several fields change together.
 */
export async function updateOrderFields(
  id: string,
  patch: Partial<
    Pick<
      Order,
      | "status"
      | "total"
      | "quotedTotal"
      | "quoteNote"
      | "paymentMethod"
      | "creditDueDate"
      | "couponCode"
      | "couponDiscount"
    >
  >
): Promise<Order | null> {
  if (!hasDatabase) {
    const order = memOrders.find((o) => o.id === id);
    if (!order) return null;
    Object.assign(order, patch);
    return order;
  }
  await connectToDatabase();
  const doc = await OrderModel.findByIdAndUpdate(id, patch, { new: true })
    .lean()
    .catch(() => null);
  return doc ? docToOrder(doc) : null;
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!hasDatabase) {
    return memOrders.find((o) => o.id === id) ?? null;
  }
  await connectToDatabase();
  const doc = await OrderModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? docToOrder(doc) : null;
}
