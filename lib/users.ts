import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/lib/models/User";
import type { AccountType, WholesaleStatus } from "@/lib/types";

export type UserRole = "customer" | "admin";

export interface BusinessInfo {
  companyName: string;
  gstin: string;
  businessPhone: string;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountType: AccountType;
  wholesaleStatus: WholesaleStatus;
  companyName: string;
  gstin: string;
  businessPhone: string;
}

/** Public shape returned to clients — never includes the password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  wholesaleStatus: WholesaleStatus;
  /** True only when the buyer is an approved wholesaler. The single flag callers gate on. */
  isWholesaler: boolean;
  companyName: string;
  gstin: string;
  businessPhone: string;
}

export function isApprovedWholesaler(u: {
  accountType: AccountType;
  wholesaleStatus: WholesaleStatus;
}): boolean {
  return u.accountType === "wholesale" && u.wholesaleStatus === "approved";
}

export function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    accountType: u.accountType,
    wholesaleStatus: u.wholesaleStatus,
    isWholesaler: isApprovedWholesaler(u),
    companyName: u.companyName,
    gstin: u.gstin,
    businessPhone: u.businessPhone,
  };
}

/** Map a Mongo user doc to StoredUser, defaulting the newer account fields. */
function docToStoredUser(doc: any): StoredUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    accountType: doc.accountType ?? "retail",
    wholesaleStatus: doc.wholesaleStatus ?? "none",
    companyName: doc.companyName ?? "",
    gstin: doc.gstin ?? "",
    businessPhone: doc.businessPhone ?? "",
  };
}

/*
 * In-memory fallback store, used only when MONGODB_URI is not configured so the
 * auth flow is testable out of the box. NOTE: this resets whenever the server
 * restarts, and does not work across multiple worker processes. It exists for
 * local development only — configure MONGODB_URI for real persistence.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memUsers: Map<string, StoredUser> | undefined;
}
const memUsers: Map<string, StoredUser> = global._memUsers ?? new Map();
global._memUsers = memUsers;

let memIdCounter = memUsers.size;
function nextMemId(): string {
  memIdCounter += 1;
  return `mem_${memIdCounter}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const key = normalizeEmail(email);
  if (!hasDatabase) {
    return memUsers.get(key) ?? null;
  }
  await connectToDatabase();
  const doc = await UserModel.findOne({ email: key }).lean<any>();
  if (!doc) return null;
  return docToStoredUser(doc);
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  if (!hasDatabase) {
    for (const u of memUsers.values()) if (u.id === id) return u;
    return null;
  }
  await connectToDatabase();
  const doc = await UserModel.findById(id).lean<any>().catch(() => null);
  if (!doc) return null;
  return docToStoredUser(doc);
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<StoredUser> {
  const email = normalizeEmail(input.email);
  const role = input.role ?? "customer";

  if (!hasDatabase) {
    const user: StoredUser = {
      id: nextMemId(),
      name: input.name.trim(),
      email,
      passwordHash: input.passwordHash,
      role,
      accountType: "retail",
      wholesaleStatus: "none",
      companyName: "",
      gstin: "",
      businessPhone: "",
    };
    memUsers.set(email, user);
    return user;
  }

  await connectToDatabase();
  const doc = await UserModel.create({
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    role,
  });
  return docToStoredUser(doc.toObject());
}

/**
 * Find a stored user by id in the in-memory map (used by mutations that need to
 * write back to the same object reference).
 */
function memUserById(id: string): StoredUser | null {
  for (const u of memUsers.values()) if (u.id === id) return u;
  return null;
}

/**
 * Record a wholesale application: captures business details and moves the user
 * to accountType "wholesale" with status "pending" (awaiting admin approval).
 */
export async function applyForWholesale(
  userId: string,
  business: BusinessInfo
): Promise<StoredUser | null> {
  if (!hasDatabase) {
    const user = memUserById(userId);
    if (!user) return null;
    user.accountType = "wholesale";
    user.wholesaleStatus = "pending";
    user.companyName = business.companyName;
    user.gstin = business.gstin;
    user.businessPhone = business.businessPhone;
    return user;
  }
  await connectToDatabase();
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    {
      accountType: "wholesale",
      wholesaleStatus: "pending",
      companyName: business.companyName,
      gstin: business.gstin,
      businessPhone: business.businessPhone,
    },
    { new: true }
  )
    .lean<any>()
    .catch(() => null);
  return doc ? docToStoredUser(doc) : null;
}

/** Admin: approve/reject a wholesale application (or reset it). */
export async function setWholesaleStatus(
  userId: string,
  status: WholesaleStatus
): Promise<StoredUser | null> {
  // A rejected/reset applicant reverts to a retail account.
  const accountType: AccountType = status === "approved" ? "wholesale" : "retail";
  if (!hasDatabase) {
    const user = memUserById(userId);
    if (!user) return null;
    user.wholesaleStatus = status;
    user.accountType = accountType;
    return user;
  }
  await connectToDatabase();
  const doc = await UserModel.findByIdAndUpdate(
    userId,
    { wholesaleStatus: status, accountType },
    { new: true }
  )
    .lean<any>()
    .catch(() => null);
  return doc ? docToStoredUser(doc) : null;
}

/** Admin: list all users who have a wholesale application on file. */
export async function listWholesaleApplicants(): Promise<PublicUser[]> {
  if (!hasDatabase) {
    return [...memUsers.values()]
      .filter((u) => u.wholesaleStatus !== "none")
      .map(toPublicUser);
  }
  await connectToDatabase();
  const docs = await UserModel.find({
    wholesaleStatus: { $in: ["pending", "approved", "rejected"] },
  })
    .lean<any[]>()
    .catch(() => []);
  return docs.map((d) => toPublicUser(docToStoredUser(d)));
}
