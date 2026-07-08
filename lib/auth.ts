import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  findUserById,
  type PublicUser,
  type StoredUser,
  toPublicUser,
} from "@/lib/users";
import { isAdminEmail } from "@/lib/admin";

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
  // In production a real secret is mandatory — a weak/absent one would let anyone
  // forge admin sessions. Fail fast rather than silently signing insecure tokens.
  if (process.env.NODE_ENV === "production") {
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

/** Resolve the currently authenticated user from the session cookie, or null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id) return null;
    const user = await findUserById(id);
    if (!user) return null;
    return publicUserWithRole(user);
  } catch {
    return null; // expired / tampered / invalid
  }
}

/** Return the current user only if they are an admin, else null. */
export async function getAdminUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

/** Return the current user only if they are an approved wholesaler, else null. */
export async function getWholesaleUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user && user.isWholesaler ? user : null;
}

/**
 * The pricing context for the current request, derived from the session. The
 * single place server code turns "who is this" into "how do we price for them".
 */
export async function getPricingContext(): Promise<{ isWholesaler: boolean }> {
  const user = await getCurrentUser();
  return { isWholesaler: Boolean(user?.isWholesaler) };
}
