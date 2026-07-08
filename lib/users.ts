import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/lib/models/User";

export type UserRole = "customer" | "admin";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

/**
 * Public shape returned to clients — never includes the password hash.
 * `isWholesaler` / `membershipTier` reflect the user's approved WholesalerProfile
 * (a distinct role); they are populated by `enrichPublicUser` in lib/auth.ts, not
 * stored on the user account. `toPublicUser` alone leaves them at their defaults.
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** True only when the user owns an APPROVED wholesaler profile. */
  isWholesaler: boolean;
  membershipTier: string;
}

export function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isWholesaler: false,
    membershipTier: "none",
  };
}

function docToStoredUser(doc: any): StoredUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
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

/** Look up a user's public shape by id (used to attribute wholesale records). */
export async function getPublicUserById(id: string): Promise<PublicUser | null> {
  const user = await findUserById(id);
  return user ? toPublicUser(user) : null;
}
