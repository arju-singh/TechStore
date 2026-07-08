import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import OrderModel from "@/lib/models/Order";

export type FulfillmentStatus = "pending" | "shipped" | "delivered";

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
  /** Marketplace: vendor selling this line. "" = house (sold by TechStore). */
  vendorSlug?: string;
  vendorName?: string;
  /** Commission % snapshot at purchase time, for stable payout accounting. */
  commissionRate?: number;
  /** Per-line fulfillment progress, advanced by the vendor. */
  fulfillmentStatus?: FulfillmentStatus;
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
  /** Retail (B2C) vs wholesale (B2B) order. */
  orderType: "retail" | "wholesale";
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
  orderType?: "retail" | "wholesale";
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
    orderType: doc.orderType === "wholesale" ? "wholesale" : "retail",
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
      orderType: input.orderType ?? "retail",
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

// ---------------------------------------------------------------------------
// Marketplace: per-vendor views of the single, vendor-tagged order
// ---------------------------------------------------------------------------

export interface VendorOrderGroup {
  vendorSlug: string;
  vendorName: string;
  items: OrderItem[];
  /** Sum of this vendor's line totals (price × qty). */
  subtotal: number;
}

/** Group one order's items by vendor (house items land under vendorSlug ""). */
export function splitOrderByVendor(order: Order): VendorOrderGroup[] {
  const groups = new Map<string, VendorOrderGroup>();
  for (const item of order.items) {
    const slug = item.vendorSlug ?? "";
    const g =
      groups.get(slug) ??
      { vendorSlug: slug, vendorName: item.vendorName ?? "", items: [], subtotal: 0 };
    g.items.push(item);
    g.subtotal += item.price * item.qty;
    groups.set(slug, g);
  }
  return [...groups.values()];
}

/** A single vendor's slice of an order — only their lines, for the vendor portal. */
export interface VendorOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  address: OrderAddress;
  items: OrderItem[];
  vendorSubtotal: number;
  orderType: "retail" | "wholesale";
  /** Aggregate of the vendor's line fulfillments: a shared value, or "mixed". */
  fulfillment: FulfillmentStatus | "mixed";
}

function toVendorOrder(order: Order, vendorSlug: string): VendorOrder {
  const items = order.items.filter((i) => (i.vendorSlug ?? "") === vendorSlug);
  const statuses = new Set(items.map((i) => i.fulfillmentStatus ?? "pending"));
  const fulfillment: FulfillmentStatus | "mixed" =
    statuses.size === 1 ? ([...statuses][0] as FulfillmentStatus) : "mixed";
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    address: order.address,
    items,
    vendorSubtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    orderType: order.orderType,
    fulfillment,
  };
}

/** Every order containing at least one of a vendor's lines, projected to those lines. */
export async function getOrdersForVendor(vendorSlug: string): Promise<VendorOrder[]> {
  if (!vendorSlug) return [];
  let source: Order[];
  if (!hasDatabase) {
    source = memOrders;
  } else {
    await connectToDatabase();
    const docs = await OrderModel.find({ "items.vendorSlug": vendorSlug })
      .sort({ createdAt: -1 })
      .lean();
    source = docs.map(docToOrder);
  }
  return source
    .filter((o) => o.items.some((i) => (i.vendorSlug ?? "") === vendorSlug))
    .map((o) => toVendorOrder(o, vendorSlug));
}

/**
 * Advance the fulfillment status of every line a vendor owns in an order. Scoped
 * to `vendorSlug` so a vendor can only ever touch their own lines — the caller
 * passes the authenticated vendor's slug.
 */
export async function updateVendorItemFulfillment(
  orderId: string,
  vendorSlug: string,
  status: FulfillmentStatus
): Promise<Order | null> {
  if (!vendorSlug) return null;
  if (!hasDatabase) {
    const order = memOrders.find((o) => o.id === orderId);
    if (!order) return null;
    let touched = false;
    for (const item of order.items) {
      if ((item.vendorSlug ?? "") === vendorSlug) {
        item.fulfillmentStatus = status;
        touched = true;
      }
    }
    return touched ? order : null;
  }
  await connectToDatabase();
  const res = await OrderModel.updateOne(
    { _id: orderId, "items.vendorSlug": vendorSlug },
    { $set: { "items.$[e].fulfillmentStatus": status } },
    { arrayFilters: [{ "e.vendorSlug": vendorSlug }] }
  ).catch(() => null);
  if (!res || res.matchedCount === 0) return null;
  return getOrderById(orderId);
}
