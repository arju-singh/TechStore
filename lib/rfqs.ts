import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import WholesaleRfqModel from "@/lib/models/WholesaleRfq";

/** RFQ (Request For Quote) data layer. DB-only, fail-loud. */

export type RfqStatus = "pending" | "accepted" | "rejected" | "countered";

export interface WholesaleRfq {
  id: string;
  wholesalerId: string;
  userId: string;
  businessName: string;
  vendorSlug: string;
  productSlug: string;
  productName: string;
  requestedQty: number;
  proposedPrice: number;
  notes: string;
  status: RfqStatus;
  vendorCounterPrice: number;
  vendorNote: string;
  agreedPrice: number;
  convertedOrderId: string;
  createdAt: string;
}

function docToRfq(doc: any): WholesaleRfq {
  return {
    id: String(doc._id ?? doc.id),
    wholesalerId: doc.wholesalerId,
    userId: doc.userId,
    businessName: doc.businessName ?? "",
    vendorSlug: doc.vendorSlug ?? "",
    productSlug: doc.productSlug,
    productName: doc.productName,
    requestedQty: Number(doc.requestedQty) || 0,
    proposedPrice: Number(doc.proposedPrice) || 0,
    notes: doc.notes ?? "",
    status: (doc.status ?? "pending") as RfqStatus,
    vendorCounterPrice: Number(doc.vendorCounterPrice) || 0,
    vendorNote: doc.vendorNote ?? "",
    agreedPrice: Number(doc.agreedPrice) || 0,
    convertedOrderId: doc.convertedOrderId ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export interface NewRfqInput {
  wholesalerId: string;
  userId: string;
  businessName: string;
  vendorSlug: string;
  productSlug: string;
  productName: string;
  requestedQty: number;
  proposedPrice: number;
  notes: string;
}

export async function createRfq(input: NewRfqInput): Promise<WholesaleRfq> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleRfqModel.create({ ...input, status: "pending" });
  return docToRfq(doc.toObject());
}

export async function getRfqById(id: string): Promise<WholesaleRfq | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleRfqModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? docToRfq(doc) : null;
}

export async function getRfqsForVendor(
  vendorSlug: string
): Promise<WholesaleRfq[]> {
  requireDatabase();
  await connectToDatabase();
  const docs = await WholesaleRfqModel.find({ vendorSlug })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(docToRfq);
}

export async function getRfqsForWholesaler(
  wholesalerId: string
): Promise<WholesaleRfq[]> {
  requireDatabase();
  await connectToDatabase();
  const docs = await WholesaleRfqModel.find({ wholesalerId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(docToRfq);
}

export interface RfqResponse {
  status: RfqStatus; // accepted | rejected | countered
  vendorCounterPrice?: number;
  vendorNote?: string;
  /** The per-unit price the wholesaler may order at (agreed or countered). */
  agreedPrice?: number;
}

export async function respondToRfq(
  id: string,
  response: RfqResponse
): Promise<WholesaleRfq | null> {
  requireDatabase();
  await connectToDatabase();
  const patch: Record<string, unknown> = {
    status: response.status,
    vendorNote: response.vendorNote ?? "",
  };
  if (response.status === "countered") {
    patch.vendorCounterPrice = response.vendorCounterPrice ?? 0;
    patch.agreedPrice = response.vendorCounterPrice ?? 0;
  } else if (response.status === "accepted") {
    patch.agreedPrice = response.agreedPrice ?? 0;
  }
  const doc = await WholesaleRfqModel.findByIdAndUpdate(id, patch, { new: true })
    .lean()
    .catch(() => null);
  return doc ? docToRfq(doc) : null;
}

/**
 * Atomically CLAIM an RFQ for conversion: a compare-and-swap that only succeeds
 * when it hasn't been converted yet. Prevents two concurrent converts from both
 * creating an order / drawing stock + credit for the same RFQ. Returns true for
 * the single winner; the loser gets false and must abort.
 */
export async function claimRfqForConversion(id: string): Promise<boolean> {
  requireDatabase();
  await connectToDatabase();
  const res = await WholesaleRfqModel.findOneAndUpdate(
    { _id: id, $or: [{ convertedOrderId: "" }, { convertedOrderId: { $exists: false } }] },
    { $set: { convertedOrderId: "pending" } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return Boolean(res);
}

export async function markRfqConverted(
  id: string,
  orderId: string
): Promise<WholesaleRfq | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleRfqModel.findByIdAndUpdate(
    id,
    { convertedOrderId: orderId },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToRfq(doc) : null;
}
