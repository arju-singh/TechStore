import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  type Auth,
} from "firebase/auth";
import { firebaseWebConfig, firebaseClientConfigured } from "./firebaseConfig";

/**
 * Firebase *client* SDK wrapper — sign the shopper in/out in the browser and
 * return a fresh ID token to exchange for a server session cookie. This module
 * pulls the Firebase JS bundle, so it is only ever imported dynamically (from
 * `lib/authClient.tsx`) and only when `firebaseClientConfigured` is true. That
 * keeps Firebase out of the bundle entirely on deployments that don't use it.
 */

let cachedAuth: Auth | null = null;

function clientAuth(): Auth {
  if (!firebaseClientConfigured) {
    throw new Error("Firebase is not configured in this environment.");
  }
  if (cachedAuth) return cachedAuth;
  const app: FirebaseApp = getApps()[0] ?? initializeApp({ ...firebaseWebConfig });
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/** Sign in with email/password and return a fresh ID token. */
export async function firebaseSignIn(
  email: string,
  password: string
): Promise<string> {
  const cred = await signInWithEmailAndPassword(clientAuth(), email, password);
  return cred.user.getIdToken();
}

/** Create an account, set the display name, and return a fresh ID token. */
export async function firebaseSignUp(
  name: string,
  email: string,
  password: string
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(clientAuth(), email, password);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user.getIdToken();
}

/** Sign the user out of Firebase on the client (the server cookie is cleared separately). */
export async function firebaseSignOut(): Promise<void> {
  await signOut(clientAuth());
}

/** Map Firebase auth error codes to friendly, non-leaky messages. */
export function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters).";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
