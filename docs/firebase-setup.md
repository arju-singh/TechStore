# Firebase Auth — setup steps

A focused walkthrough for provisioning Firebase Authentication and wiring it to
TechStore. Complements [`DEPLOYMENT.md`](../DEPLOYMENT.md) (the full deploy guide).

**What you're setting up:** email/password sign-in. When the six env vars at the
end are all present, the app auto-flips from the legacy custom-JWT auth to
Firebase — no code change. Firebase Auth (email/password) runs on the free
**Spark** plan; no billing card required for this.

> **Secret handling:** the service-account JSON (step 5) is a real secret. Its
> values go **only** into Vercel env vars / a local `.env` — never into git, a
> commit, a screenshot, or a message. The four `NEXT_PUBLIC_*` values are public
> by design (they identify the project to Firebase) and are safe to expose.

---

## 1. Create the project
[console.firebase.google.com](https://console.firebase.google.com) → **Add
project** → name it (e.g. `techstore`). Google Analytics is optional — you can
disable it; nothing in the app uses it.

## 2. Register a Web App → get the web config
In the project, click the **`</>`** (Web) icon → register an app (nickname only;
**do not** enable Firebase Hosting). Firebase shows a `firebaseConfig` object:

```js
const firebaseConfig = {
  apiKey: "AIza…",                      // → NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "techstore-xxxx.firebaseapp.com",  // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "techstore-xxxx",          // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "…",                   // not used — ignore
  messagingSenderId: "…",               // not used — ignore
  appId: "1:…:web:…",                   // → NEXT_PUBLIC_FIREBASE_APP_ID
};
```

Copy the **four** mapped values. (`storageBucket` / `messagingSenderId` /
`measurementId` are not read by our code.)

## 3. Enable Email/Password sign-in
**Authentication → Get started → Sign-in method** → enable **Email/Password**.
Leave "Email link (passwordless sign-in)" off unless you want it. (Only
email/password is wired in the app today — Google/social is a later add.)

## 4. Add your authorized domains
**Authentication → Settings → Authorized domains** → add your production domain
(e.g. `techstore.example`) and, if you want branch previews to sign in, your
Vercel preview domain. `localhost` is already authorized, so you can test locally.

## 5. Generate the Admin service account (the secret half)
**Project settings (⚙️) → Service accounts → Generate new private key** →
downloads a JSON file. From it you need two fields:

| JSON field | → env var |
| --- | --- |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

**The private-key gotcha (read this):** `private_key` is a multi-line PEM. Store
it as a **single line with literal `\n`** — exactly the form it already has inside
the JSON string:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv…\n…\n-----END PRIVATE KEY-----\n"
```

The server un-escapes `\n` back into real newlines at runtime, so keep the
backslash-n as-is; don't convert them to actual line breaks. Wrap the value in
double quotes.

> The project id is **shared** — the Admin SDK reuses
> `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, so there's no separate project-id secret to set.

## 6. Set the six env vars
Add all six in **Vercel → Settings → Environment Variables** (Production, and
Preview if you want branch sign-in), or in a local `.env` to test on `localhost`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Redeploy (or restart `npm run dev`). With all six present, sign-in is now
Firebase. Miss any one and the app quietly stays on the legacy fallback.

## 7. Keep your admin access
Admin is granted by email via `ADMIN_EMAILS` (unchanged). So:
1. Make sure `ADMIN_EMAILS` includes your email.
2. Register **that same email** in Firebase — either sign up on the site once
   Firebase is live, or **Authentication → Users → Add user**.

On first sign-in the app links the Firebase identity to your existing account
**by email**, so you keep your account, orders, and admin role.

---

## Verify it works
- Sign up a new account → land on `/account` (session persists on refresh).
- Log out, log back in.
- Your `ADMIN_EMAILS` account can open `/admin`.
- **Firebase Console → Authentication → Users** shows the accounts you created.
- Wrong password shows "Invalid email or password" and stays on the page.

## Test locally first (optional, recommended)
Put the six vars in a local `.env`, run `npm run dev`, and sign in at
`http://localhost:3000` — `localhost` is an authorized domain by default. This
verifies the whole Firebase flow before you touch production. Share nothing: the
`.env` is gitignored and stays on your machine.
