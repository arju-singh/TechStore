/**
 * Firebase *client* config — env-only, no SDK imports, so this module is cheap to
 * import from anywhere (client or server) without pulling the Firebase JS bundle.
 * The heavy `firebase/*` code lives in `lib/firebaseClient.ts`, which is loaded
 * lazily only when `firebaseClientConfigured` is true — so a deployment without
 * Firebase env vars never ships Firebase to the browser.
 *
 * These are all NEXT_PUBLIC_* values: public by design (they identify the project
 * to Firebase and are meant to reach the browser). Security lives in Firebase Auth
 * settings + Authorized Domains, never in hiding this config.
 */

export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

/** True when the public Firebase web config is fully present (build-time inlined). */
export const firebaseClientConfigured = Boolean(
  firebaseWebConfig.apiKey &&
    firebaseWebConfig.authDomain &&
    firebaseWebConfig.projectId &&
    firebaseWebConfig.appId
);
