import "server-only";
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";

/**
 * Firebase Admin (server) — verifies ID tokens and mints/verifies session
 * cookies. Node-runtime only (never Edge). Credentials come from a service
 * account: the project id is shared with the client config, the client email +
 * private key are secret. `firebaseAdminConfigured` gates every use so the app
 * still runs (on the legacy custom-JWT path) when Firebase isn't set up yet.
 */

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
// Accept both a literal-newline value and the common `\n`-escaped single-line
// form that env stores (Vercel, .env) use for multi-line PEM keys.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

/** True when the Firebase Admin service-account credentials are fully present. */
export const firebaseAdminConfigured = Boolean(
  projectId && clientEmail && privateKey
);

/** Session cookie lifetime — mirrors the legacy 7-day custom-JWT session. */
export const SESSION_COOKIE_DAYS = 7;

let cachedAuth: Auth | null = null;

/**
 * Lazily initialize the Admin app (once per runtime) and return its Auth
 * instance. The `firebase-admin` SDK is imported dynamically HERE — not at module
 * load — so it's required only on runtimes that actually use Firebase; a
 * fallback-only deploy never pulls it in. Throws if credentials are absent —
 * callers gate on `firebaseAdminConfigured` first.
 */
export async function adminAuth(): Promise<Auth> {
  if (!firebaseAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured (set FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and the project id)."
    );
  }
  if (cachedAuth) return cachedAuth;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const app: App =
    getApps()[0] ??
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  cachedAuth = getAuth(app);
  return cachedAuth;
}
