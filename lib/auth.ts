import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  findUserById,
  linkOrCreateFirebaseUser,
  type PublicUser,
  type StoredUser,
  toPublicUser,
} from "@/lib/users";
import { isAdminEmail } from "@/lib/admin";
import { hasDatabase } from "@/lib/mongodb";
import { getVendorByOwner, type Vendor } from "@/lib/vendors";
import { getWholesalerByUser, type WholesalerProfile } from "@/lib/wholesalers";
import {
  firebaseAdminConfigured,
  adminAuth,
  SESSION_COOKIE_DAYS,
} from "@/lib/firebaseAdmin";

/**
 * Which auth system is live. When the Firebase Admin credentials are present the
 * app authenticates via Firebase (client sign-in → server session cookie);
 * otherwise it falls back to the legacy custom-JWT + bcrypt flow so dev, tests,
 * and un-provisioned environments keep working. This is the single switch the
 * whole auth layer branches on.
 */
export const firebaseAuthEnabled = firebaseAdminConfigured;

const COOKIE_NAME = "techstore_session";
const SESSION_DAYS = 7;

/**
 * Secret for signing JWTs. Set AUTH_SECRET in the environment for production.
 * A dev fallback keeps things working locally, but sessions signed with it are
 * not secure — always set a real secret in any deployed environment.
 */
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret);
  }
  // In production a real secret is mandatory FOR THE LEGACY PATH — a weak/absent
  // one would let anyone forge admin sessions. When Firebase auth is enabled this
  // secret is unused (sessions are Firebase-signed), so don't require it then.
  if (process.env.NODE_ENV === "production" && !firebaseAuthEnabled) {
    throw new Error(
      "AUTH_SECRET is required in production (set a strong value, at least 16 characters)."
    );
  }
  // Dev-only fallback so the app runs out of the box locally.
  return new TextEncoder().encode(
    "dev-insecure-secret-change-me-please-set-AUTH_SECRET"
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function signSession(user: StoredUser): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

/** Create a session for the user and set the httpOnly cookie. */
export async function createSession(user: StoredUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Convert a stored user to its public shape, elevating the role to "admin" when
 * the email is configured in ADMIN_EMAILS. Single source of truth so login,
 * signup, and getCurrentUser all report the same role.
 */
export function publicUserWithRole(user: StoredUser): PublicUser {
  const publicUser = toPublicUser(user);
  if (isAdminEmail(publicUser.email)) publicUser.role = "admin";
  return publicUser;
}

/**
 * Public user + role + live wholesaler status. `isWholesaler`/`membershipTier`
 * are derived from the user's approved WholesalerProfile, re-read fresh (never
 * trusted from the JWT). With no database there are no wholesalers, so it stays
 * false — the retail auth path keeps working without a DB. Used by getCurrentUser
 * and the login/me routes so client and server agree on wholesaler status.
 */
export async function enrichPublicUser(user: StoredUser): Promise<PublicUser> {
  const publicUser = publicUserWithRole(user);
  if (hasDatabase) {
    try {
      const profile = await getWholesalerByUser(publicUser.id);
      if (profile) {
        publicUser.isWholesaler = profile.status === "approved";
        publicUser.membershipTier = profile.membershipTier;
      }
    } catch {
      // A wholesaler lookup failure must never break authentication.
    }
  }
  return publicUser;
}

/** Resolve the currently authenticated user from the session cookie, or null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  // Firebase path: the cookie is a Firebase session cookie; verify it with the
  // Admin SDK, then map the Firebase identity to our user record (link-by-email
  // for legacy accounts). Roles / wholesaler status are re-derived, never trusted.
  if (firebaseAuthEnabled) {
    try {
      const auth = await adminAuth();
      const decoded = await auth.verifySessionCookie(token);
      const user = await linkOrCreateFirebaseUser({
        uid: decoded.uid,
        email: decoded.email ?? "",
        name: (decoded.name as string | undefined) ?? decoded.email ?? "User",
      });
      return enrichPublicUser(user);
    } catch {
      return null; // expired / revoked / invalid
    }
  }

  // Legacy path: custom HS256 JWT signed with AUTH_SECRET.
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id) return null;
    const user = await findUserById(id);
    if (!user) return null;
    return enrichPublicUser(user);
  } catch {
    return null; // expired / tampered / invalid
  }
}

/**
 * Firebase path: exchange a freshly-minted client ID token for an httpOnly
 * session cookie (verified + created by the Admin SDK), set it, and return the
 * enriched app user. Throws if the token is invalid or Firebase isn't enabled.
 */
export async function createFirebaseSession(idToken: string): Promise<PublicUser> {
  if (!firebaseAuthEnabled) {
    throw new Error("Firebase auth is not enabled.");
  }
  const auth = await adminAuth();
  // Verify first so a bad/forged token fails before we mint anything.
  const decoded = await auth.verifyIdToken(idToken);
  const expiresIn = SESSION_COOKIE_DAYS * 24 * 60 * 60 * 1000; // ms
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  const store = await cookies();
  store.set(COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_DAYS * 24 * 60 * 60,
  });
  const user = await linkOrCreateFirebaseUser({
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: (decoded.name as string | undefined) ?? decoded.email ?? "User",
  });
  return enrichPublicUser(user);
}

/** Return the current user only if they are an admin, else null. */
export async function getAdminUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

/**
 * The current user's wholesaler context, resolved fresh from the session owner
 * each request. `profile` is the wholesaler they own regardless of status, so a
 * layout can branch on pending / approved / rejected / suspended. DB-only: with
 * no database there are no profiles, so profile is null.
 */
export async function getWholesalerContext(): Promise<{
  user: PublicUser | null;
  profile: WholesalerProfile | null;
}> {
  const user = await getCurrentUser();
  if (!user || !hasDatabase) return { user: user ?? null, profile: null };
  const profile = await getWholesalerByUser(user.id);
  return { user, profile };
}

/**
 * Return the current user together with their wholesaler profile ONLY when it is
 * APPROVED. The authoritative gate for wholesale-portal data and writes — a
 * pending/rejected/suspended/blacklisted wholesaler gets null.
 */
export async function getWholesalerUser(): Promise<{
  user: PublicUser;
  profile: WholesalerProfile;
} | null> {
  const { user, profile } = await getWholesalerContext();
  if (!user || !profile || profile.status !== "approved") return null;
  return { user, profile };
}

/**
 * The current user's vendor context, resolved fresh from the session owner each
 * request (never trusted from the JWT — mirrors how wholesaler status is
 * re-derived). `vendor` is the store they own regardless of its status, so a
 * layout can branch on pending / approved / suspended.
 */
export async function getVendorContext(): Promise<{
  user: PublicUser | null;
  vendor: Vendor | null;
}> {
  const user = await getCurrentUser();
  if (!user) return { user: null, vendor: null };
  const vendor = await getVendorByOwner(user.id);
  return { user, vendor };
}

/**
 * Return the current user together with their vendor ONLY when that vendor is
 * approved. The authoritative gate for vendor-portal writes and data access —
 * a pending/suspended/rejected vendor gets null.
 */
export async function getVendorUser(): Promise<{
  user: PublicUser;
  vendor: Vendor;
} | null> {
  const { user, vendor } = await getVendorContext();
  if (!user || !vendor || vendor.status !== "approved") return null;
  return { user, vendor };
}

/**
 * The pricing context for the current request, derived from the session. The
 * single place server code turns "who is this" into "how do we price for them".
 */
export async function getPricingContext(): Promise<{ isWholesaler: boolean }> {
  const user = await getCurrentUser();
  return { isWholesaler: Boolean(user?.isWholesaler) };
}
