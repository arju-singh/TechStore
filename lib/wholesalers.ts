import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import WholesalerProfileModel from "@/lib/models/WholesalerProfile";

/**
 * WHOLESALER role data layer. DB-ONLY BY DESIGN — every function calls
 * requireDatabase() first and throws loudly if MONGODB_URI is not set. There is
 * deliberately NO in-memory fallback and NO seeded/fabricated data here: a
 * wholesaler only exists if it was really created and really approved.
 */

export type WholesalerStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_docs"
  | "suspended"
  | "blacklisted";

export type BusinessType =
  | "pet_shop"
  | "distributor"
  | "breeder"
  | "veterinary_clinic"
  | "ngo"
  | "supermarket"
  | "wholesaler"
  | "retail_shop"
  | "importer"
  | "exporter"
  | "other";

export type MembershipTier =
  | "none"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export interface WholesaleAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface WholesaleDocument {
  id: string;
  docType: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  /** Where the bytes live. Absent on legacy records → treated as "disk". */
  storage?: "disk" | "cloudinary";
  resourceType?: string;
  format?: string;
}

export interface WholesalerProfile {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  taxNumber: string;
  tradeLicenseNumber: string;
  businessType: BusinessType;
  businessAddress: WholesaleAddress;
  warehouseAddress: WholesaleAddress;
  email: string;
  phone: string;
  website: string;
  expectedMonthlyPurchase: number;
  categoriesInterested: string[];
  documents: WholesaleDocument[];
  status: WholesalerStatus;
  approvedBy: string;
  approvedAt: string;
  rejectionReason: string;
  membershipTier: MembershipTier;
  loyaltyPoints: number;
  createdAt: string;
}

const EMPTY_ADDRESS: WholesaleAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

function normalizeAddress(a: any): WholesaleAddress {
  if (!a || typeof a !== "object") return { ...EMPTY_ADDRESS };
  return {
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    pincode: a.pincode ?? "",
    country: a.country ?? "India",
  };
}

function docToProfile(doc: any): WholesalerProfile {
  return {
    id: String(doc._id ?? doc.id),
    userId: doc.userId,
    businessName: doc.businessName,
    ownerName: doc.ownerName,
    taxNumber: doc.taxNumber,
    tradeLicenseNumber: doc.tradeLicenseNumber ?? "",
    businessType: doc.businessType,
    businessAddress: normalizeAddress(doc.businessAddress),
    warehouseAddress: normalizeAddress(doc.warehouseAddress),
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    website: doc.website ?? "",
    expectedMonthlyPurchase: Number(doc.expectedMonthlyPurchase) || 0,
    categoriesInterested: Array.isArray(doc.categoriesInterested)
      ? doc.categoriesInterested
      : [],
    documents: Array.isArray(doc.documents)
      ? doc.documents.map((d: any) => ({
          id: String(d._id ?? d.id ?? ""),
          docType: d.docType,
          originalName: d.originalName,
          storedName: d.storedName,
          mimeType: d.mimeType,
          size: Number(d.size) || 0,
          uploadedAt: d.uploadedAt ?? "",
          storage: d.storage === "cloudinary" ? "cloudinary" : "disk",
          resourceType: d.resourceType ?? "",
          format: d.format ?? "",
        }))
      : [],
    status: (doc.status ?? "pending") as WholesalerStatus,
    approvedBy: doc.approvedBy ?? "",
    approvedAt: doc.approvedAt ?? "",
    rejectionReason: doc.rejectionReason ?? "",
    membershipTier: (doc.membershipTier ?? "none") as MembershipTier,
    loyaltyPoints: Number(doc.loyaltyPoints) || 0,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export interface NewWholesalerInput {
  userId: string;
  businessName: string;
  ownerName: string;
  taxNumber: string;
  tradeLicenseNumber?: string;
  businessType: BusinessType;
  businessAddress?: Partial<WholesaleAddress>;
  warehouseAddress?: Partial<WholesaleAddress>;
  email: string;
  phone: string;
  website?: string;
  expectedMonthlyPurchase?: number;
  categoriesInterested?: string[];
}

export async function createWholesalerProfile(
  input: NewWholesalerInput
): Promise<WholesalerProfile> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.create({
    userId: input.userId,
    businessName: input.businessName,
    ownerName: input.ownerName,
    taxNumber: input.taxNumber,
    tradeLicenseNumber: input.tradeLicenseNumber ?? "",
    businessType: input.businessType,
    businessAddress: { ...EMPTY_ADDRESS, ...(input.businessAddress ?? {}) },
    warehouseAddress: { ...EMPTY_ADDRESS, ...(input.warehouseAddress ?? {}) },
    email: input.email,
    phone: input.phone,
    website: input.website ?? "",
    expectedMonthlyPurchase: input.expectedMonthlyPurchase ?? 0,
    categoriesInterested: input.categoriesInterested ?? [],
    status: "pending",
  });
  return docToProfile(doc.toObject());
}

export async function getWholesalerById(
  id: string
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}

/** The profile owned by a user (one per user), or null. */
export async function getWholesalerByUser(
  userId: string
): Promise<WholesalerProfile | null> {
  if (!userId) return null;
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.findOne({ userId })
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}

export async function getAllWholesalers(): Promise<WholesalerProfile[]> {
  requireDatabase();
  await connectToDatabase();
  const docs = await WholesalerProfileModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(docToProfile);
}

export async function getWholesalersByStatus(
  status: WholesalerStatus
): Promise<WholesalerProfile[]> {
  const all = await getAllWholesalers();
  return all.filter((w) => w.status === status);
}

export interface StatusChange {
  status: WholesalerStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export async function updateWholesalerStatus(
  id: string,
  change: StatusChange
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const patch: Record<string, unknown> = { status: change.status };
  if (change.status === "approved") {
    patch.approvedBy = change.approvedBy ?? "";
    patch.approvedAt = change.approvedAt ?? new Date().toISOString();
    patch.rejectionReason = "";
  }
  if (
    change.status === "rejected" ||
    change.status === "needs_docs" ||
    change.status === "blacklisted"
  ) {
    patch.rejectionReason = change.rejectionReason ?? "";
  }
  const doc = await WholesalerProfileModel.findByIdAndUpdate(id, patch, {
    new: true,
  })
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}

export async function updateWholesalerProfile(
  id: string,
  patch: Partial<
    Pick<
      WholesalerProfile,
      | "businessName"
      | "ownerName"
      | "tradeLicenseNumber"
      | "businessType"
      | "businessAddress"
      | "warehouseAddress"
      | "email"
      | "phone"
      | "website"
      | "expectedMonthlyPurchase"
      | "categoriesInterested"
    >
  >
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.findByIdAndUpdate(id, patch, {
    new: true,
  })
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}

/** Append a real uploaded document's metadata to the profile. */
export async function addWholesalerDocument(
  id: string,
  doc: Omit<WholesaleDocument, "id">
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const updated = await WholesalerProfileModel.findByIdAndUpdate(
    id,
    { $push: { documents: doc } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return updated ? docToProfile(updated) : null;
}

export async function setMembershipTier(
  id: string,
  tier: MembershipTier
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.findByIdAndUpdate(
    id,
    { membershipTier: tier },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}

/** Atomically add (or subtract) loyalty points, returning the new profile. */
export async function incrementLoyaltyPoints(
  id: string,
  delta: number
): Promise<WholesalerProfile | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesalerProfileModel.findByIdAndUpdate(
    id,
    { $inc: { loyaltyPoints: delta } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToProfile(doc) : null;
}
