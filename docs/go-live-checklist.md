# Go-live checklist

The app is **code-complete** — nothing remains to build. What's left is
provisioning, deploying, and verifying. Work top-to-bottom and check items off.

- Detailed per-service setup: [`DEPLOYMENT.md`](../DEPLOYMENT.md)
- Firebase walkthrough: [`docs/firebase-setup.md`](firebase-setup.md)

**Legend:** 👤 = you (provision/deploy) · 🤖 = Claude (verify against the live URL)

**Graceful degradation:** every integration is independent. Minimum to boot with
working auth + data is `MONGODB_URI` + the six Firebase vars (or just
`AUTH_SECRET`); add the rest incrementally — each only unlocks its own feature.

---

## Phase 1 — Provision accounts & collect credentials 👤

- [ ] **MongoDB Atlas** — free M0 cluster · create a DB user · **Network Access → `0.0.0.0/0`** (Vercel has no static egress IP — the #1 connection gotcha) · copy SRV string → `MONGODB_URI`
- [ ] **Firebase** — per [`firebase-setup.md`](firebase-setup.md): web config (`NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID`) + service account (`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`) · enable Email/Password · set Authorized domains
- [ ] **Cloudinary** — `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
- [ ] **Stripe** — `STRIPE_SECRET_KEY` (`sk_…`) + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_…`) *(webhook secret comes in Phase 3)*
- [ ] **Razorpay** — `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
- [ ] **Resend** — `RESEND_API_KEY` + a verified sender → `NOTIFICATION_FROM_EMAIL` (its DNS records go in Cloudflare)
- [ ] **`AUTH_SECRET`** — generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` *(unused once all six Firebase vars are set, but harmless)*
- [ ] **`ADMIN_EMAILS`**, and (recommended) **`SELLER_NAME` / `SELLER_GSTIN` / `SELLER_ADDRESS`** for GST invoices

## Phase 2 — First Vercel deploy 👤

- [ ] Import the GitHub repo into Vercel (framework auto-detected; `vercel.json` + `.nvmrc` pin install/build/Node 20)
- [ ] Add all env vars in **Settings → Environment Variables** (Production + Preview) — secrets go **here, never in git**
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the `.vercel.app` URL for now
- [ ] **Settings → Functions → Region** = match your Atlas region
- [ ] Deploy → obtain the live URL

## Phase 3 — Post-deploy wiring 👤 *(needs the live URL)*

- [ ] **Stripe webhook** → add endpoint `https://<domain>/api/payments/stripe/webhook`, subscribe **`checkout.session.completed`** (+ `payment_intent.succeeded`), copy `whsec_…` → `STRIPE_WEBHOOK_SECRET` → **redeploy**
- [ ] **Firebase** → add the production domain under **Authentication → Settings → Authorized domains**
- [ ] **Grant yourself admin** → ensure `ADMIN_EMAILS` includes your email, then register that same email in Firebase (link-by-email preserves the role)
- [ ] *(optional)* **Cloudflare custom domain** → point DNS at Vercel · add Resend's DNS records · update `NEXT_PUBLIC_SITE_URL` **and** the Stripe webhook URL to the final domain → redeploy

## Phase 4 — Verification 🤖 *(against the live URL)*

- [ ] Home + product listing load (Atlas connectivity)
- [ ] **Firebase sign-up / login / logout**, session persists on refresh — *not yet verified end-to-end*
- [ ] `ADMIN_EMAILS` account reaches `/admin`
- [ ] Place a **COD** order → appears under the account
- [ ] **Stripe** card → redirect → returns to order → **webhook flips it to _paid_** — *not yet verified end-to-end*
- [ ] **Razorpay** payment completes and verifies
- [ ] Admin product image upload lands on `res.cloudinary.com` — *not yet verified end-to-end*
- [ ] `robots.txt` / `sitemap.xml` show the real domain; an order invoice shows your `SELLER_*` details

---

**Critical path:** `MONGODB_URI` + the six Firebase vars light up data and auth —
those unblock the most, and can be verified first (locally via a `.env` +
`npm run dev`, since `localhost` is a Firebase-authorized domain by default).
