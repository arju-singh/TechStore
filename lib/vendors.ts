import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import VendorModel from "@/lib/models/Vendor";
import { vendors as seedVendors } from "@/data/seed";
import type { Vendor, VendorAddress, VendorStatus } from "@/lib/types";

export type { Vendor, VendorAddress, VendorStatus } from "@/lib/types";

const EMPTY_ADDRESS: VendorAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

/** Turn a store name into a URL-safe slug (letters/digits/hyphens). */
export function slugifyVendor(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/*
 * In-memory fallback, mirroring lib/orders.ts / lib/users.ts. Seeded once from
 * the demo vendors so the storefront, /stores directory, and admin Stores list
 * have content with no database. Mutations live in memory and reset on restart.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memVendors: Vendor[] | undefined;
}
function memVendors(): Vendor[] {
  if (!global._memVendors) {
    global._memVendors = seedVendors.map((v) => ({
      ...v,
      address: { ...v.address },
    }));
  }
  return global._memVendors;
}

let memSeq = 0;
function nextMemId(): string {
  memSeq += 1;
  return `ven_new_${String(memSeq).padStart(4, "0")}`;
}

function normalizeAddress(a: any): VendorAddress {
  if (!a || typeof a !== "object") return { ...EMPTY_ADDRESS };
  return {
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    pincode: a.pincode ?? "",
  };
}

function docToVendor(doc: any): Vendor {
  return {
    id: String(doc._id ?? doc.id),
    slug: doc.slug,
    name: doc.name,
    ownerUserId: doc.ownerUserId ?? "",
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    description: doc.description ?? "",
    logo: doc.logo ?? "",
    status: (doc.status ?? "pending") as VendorStatus,
    commissionRate:
      typeof doc.commissionRate === "number" ? doc.commissionRate : null,
    gstin: doc.gstin ?? "",
    address: normalizeAddress(doc.address),
    policies: doc.policies ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export interface NewVendorInput {
  name: string;
  ownerUserId: string;
  email?: string;
  phone?: string;
  description?: string;
  logo?: string;
  gstin?: string;
  address?: Partial<VendorAddress>;
  policies?: string;
}

/** Pick a slug derived from the name that isn't already taken. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugifyVendor(name) || "vendor";
  let candidate = base;
  let n = 1;
  // Loop until free. Bounded in practice by the tiny number of collisions.
  while (await getVendorBySlug(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function createVendor(
  input: NewVendorInput,
  createdAtISO: string
): Promise<Vendor> {
  const slug = await uniqueSlug(input.name);
  const base = {
    slug,
    name: input.name.trim(),
    ownerUserId: input.ownerUserId,
    email: input.email ?? "",
    phone: input.phone ?? "",
    description: input.description ?? "",
    logo: input.logo ?? "",
    status: "pending" as VendorStatus,
    commissionRate: null,
    gstin: input.gstin ?? "",
    address: { ...EMPTY_ADDRESS, ...(input.address ?? {}) },
    policies: input.policies ?? "",
  };

  if (!hasDatabase) {
    const vendor: Vendor = { id: nextMemId(), ...base, createdAt: createdAtISO };
    memVendors().unshift(vendor);
    return vendor;
  }
  await connectToDatabase();
  const doc = await VendorModel.create(base);
  return docToVendor(doc.toObject());
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  if (!hasDatabase) return memVendors().find((v) => v.id === id) ?? null;
  await connectToDatabase();
  const doc = await VendorModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!slug) return null;
  if (!hasDatabase) return memVendors().find((v) => v.slug === slug) ?? null;
  await connectToDatabase();
  const doc = await VendorModel.findOne({ slug })
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}

/** The vendor owned by a given user, if any. One vendor per owner. */
export async function getVendorByOwner(
  ownerUserId: string
): Promise<Vendor | null> {
  if (!ownerUserId) return null;
  if (!hasDatabase) {
    return memVendors().find((v) => v.ownerUserId === ownerUserId) ?? null;
  }
  await connectToDatabase();
  const doc = await VendorModel.findOne({ ownerUserId })
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}

export async function getAllVendors(): Promise<Vendor[]> {
  if (!hasDatabase) {
    return [...memVendors()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await connectToDatabase();
  const docs = await VendorModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(docToVendor);
}

export async function getVendorsByStatus(
  status: VendorStatus
): Promise<Vendor[]> {
  const all = await getAllVendors();
  return all.filter((v) => v.status === status);
}

/** Only vendors visible to shoppers (approved) — for the storefront/directory. */
export async function getApprovedVendors(): Promise<Vendor[]> {
  return getVendorsByStatus("approved");
}

export async function updateVendor(
  id: string,
  patch: Partial<
    Pick<
      Vendor,
      | "name"
      | "email"
      | "phone"
      | "description"
      | "logo"
      | "gstin"
      | "address"
      | "policies"
    >
  >
): Promise<Vendor | null> {
  if (!hasDatabase) {
    const list = memVendors();
    const v = list.find((x) => x.id === id);
    if (!v) return null;
    Object.assign(v, patch);
    if (patch.address) v.address = { ...v.address, ...patch.address };
    return v;
  }
  await connectToDatabase();
  const doc = await VendorModel.findByIdAndUpdate(id, patch, { new: true })
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}

export async function updateVendorStatus(
  id: string,
  status: VendorStatus
): Promise<Vendor | null> {
  if (!hasDatabase) {
    const v = memVendors().find((x) => x.id === id);
    if (!v) return null;
    v.status = status;
    return v;
  }
  await connectToDatabase();
  const doc = await VendorModel.findByIdAndUpdate(id, { status }, { new: true })
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}

/** Set (or clear, with null) a vendor's commission-rate override. */
export async function setCommissionRate(
  id: string,
  rate: number | null
): Promise<Vendor | null> {
  if (!hasDatabase) {
    const v = memVendors().find((x) => x.id === id);
    if (!v) return null;
    v.commissionRate = rate;
    return v;
  }
  await connectToDatabase();
  const doc = await VendorModel.findByIdAndUpdate(
    id,
    { commissionRate: rate },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToVendor(doc) : null;
}
