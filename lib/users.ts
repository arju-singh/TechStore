import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/lib/models/User";

export type UserRole = "customer" | "admin";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Firebase Auth UID, present once the account is linked to a Firebase user. */
  firebaseUid?: string;
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
    passwordHash: doc.passwordHash ?? "",
    role: doc.role,
    firebaseUid: doc.firebaseUid ?? undefined,
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

export async function findUserByFirebaseUid(
  uid: string
): Promise<StoredUser | null> {
  if (!uid) return null;
  if (!hasDatabase) {
    for (const u of memUsers.values()) if (u.firebaseUid === uid) return u;
    return null;
  }
  await connectToDatabase();
  const doc = await UserModel.findOne({ firebaseUid: uid })
    .lean<any>()
    .catch(() => null);
  return doc ? docToStoredUser(doc) : null;
}

/**
 * Resolve the app user for a VERIFIED Firebase identity, creating or linking as
 * needed (the link-by-email migration path):
 *   1. a row already linked to this uid → return it;
 *   2. a row with the same email → attach the uid and return it, so legacy
 *      accounts keep their id, orders, and roles;
 *   3. otherwise create a fresh, password-less row for this Firebase user.
 * The returned `id` is always our own id — the stable key the rest of the app
 * (orders, vendor, wholesaler) is keyed by. The Firebase uid is auth-only.
 */
export async function linkOrCreateFirebaseUser(input: {
  uid: string;
  email: string;
  name?: string;
}): Promise<StoredUser> {
  const { uid } = input;
  const email = normalizeEmail(input.email);
  const name = (input.name || email || "User").trim();

  const linked = await findUserByFirebaseUid(uid);
  if (linked) return linked;

  const byEmail = email ? await findUserByEmail(email) : null;
  if (byEmail) {
    if (byEmail.firebaseUid === uid) return byEmail;
    if (!hasDatabase) {
      byEmail.firebaseUid = uid;
      memUsers.set(byEmail.email, byEmail);
      return byEmail;
    }
    await connectToDatabase();
    const updated = await UserModel.findByIdAndUpdate(
      byEmail.id,
      { firebaseUid: uid },
      { new: true }
    )
      .lean<any>()
      .catch(() => null);
    return updated ? docToStoredUser(updated) : { ...byEmail, firebaseUid: uid };
  }

  if (!hasDatabase) {
    const user: StoredUser = {
      id: nextMemId(),
      name,
      email,
      passwordHash: "",
      role: "customer",
      firebaseUid: uid,
    };
    memUsers.set(email, user);
    return user;
  }
  await connectToDatabase();
  const doc = await UserModel.create({
    name,
    email,
    passwordHash: "",
    role: "customer",
    firebaseUid: uid,
  });
  return docToStoredUser(doc.toObject());
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
