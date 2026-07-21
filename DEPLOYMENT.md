# Deploying TechStore

This is the deploy runbook for **our** architecture. It is intentionally
different from generic "Vercel + Railway + Render" reference diagrams — see
[Architecture](#architecture) for why.

---

## Architecture

TechStore is a **single Next.js 15 app** (App Router). The `app/api/**` routes
**are** the backend — there is no separate API server. One Vercel project serves
both the UI and the API.

```
                 ┌────────────────────────────────────────────┐
   Browser  ───► │  Vercel — Next.js app (UI + /api routes)    │
                 │  • pages, server components, API handlers   │
                 └───┬───────────────┬───────────────┬─────────┘
                     │               │               │
       MongoDB Atlas │      Cloudinary (images/      │  Razorpay / Stripe
       (source of    │      KYC docs, signed         │  (payments; Stripe
        truth data)  ▼      uploads + CDN) ▼          ▼  confirms via webhook)
                 ┌────────┐        ┌──────────┐   ┌──────────────┐
                 │ Atlas  │        │Cloudinary│   │ Resend (email)│
                 └────────┘        └──────────┘   └──────────────┘

   DNS / TLS / caching:  Cloudflare  ──►  Vercel
```

**We do NOT use Railway or Render.** The chosen stack (agreed earlier) is the
"cheapest path, same features" monolith:

| Concern        | Service                              |
| -------------- | ------------------------------------ |
| Frontend + API | **Next.js on Vercel** (API routes)   |
| Database       | **MongoDB Atlas** (free M0)          |
| Images / media | **Cloudinary** (signed uploads)      |
| Payments       | **Razorpay** (India) + **Stripe**    |
| Email          | **Resend**                           |
| DNS / TLS      | **Cloudflare**                       |
| Auth           | **Firebase Auth** when configured, else custom-JWT fallback |

If you have actually decided to move to a Railway/Render topology instead, stop
here and tell me — that's a different build, not a config tweak.

---

## Environment variables

Set **every** variable in **Vercel → Project → Settings → Environment
Variables** (Production, and Preview if you want branch deploys to work).
Secrets live only there and in your local `.env` — never in git. The canonical,
commented list is [`.env.production.example`](.env.production.example); this
table is the summary.

| Variable | Kind | Required? | Where it comes from |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | **yes** | Your live origin, no trailing slash. Used for canonical/OG URLs, sitemap, robots, and **Stripe return URLs**. |
| `MONGODB_URI` | secret | **yes*** | Atlas connection string (see step 1). *Without it the app serves a read-only in-memory demo catalog and all DB-only features (orders, wholesale) fail.* |
| `AUTH_SECRET` | secret | **yes (fallback auth)** | Signs the legacy custom-JWT session. Required unless Firebase Auth is fully configured (see below). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | public | for Firebase auth | Firebase web config (Console → Project settings). |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | secret | for Firebase auth | Admin SDK service account (verifies tokens, mints session cookies). Keep the key's newlines as literal `\n`. |
| `ADMIN_EMAILS` | config | recommended | Comma-separated emails auto-elevated to admin. |
| `PLATFORM_COMMISSION_RATE` | config | no (default 10) | Platform commission % on vendor sales. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | for uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | secret | for uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | secret | for uploads | Cloudinary API secret (signs uploads / private KYC delivery). |
| `RAZORPAY_KEY_ID` | public† | for Razorpay | Razorpay key id. †Public by design — delivered to the checkout widget via our API. |
| `RAZORPAY_KEY_SECRET` | secret | for Razorpay | Server-side signature verification. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | for Stripe | Stripe `pk_...`. |
| `STRIPE_SECRET_KEY` | secret | for Stripe | Stripe `sk_...`. |
| `STRIPE_WEBHOOK_SECRET` | secret | for Stripe | `whsec_...` from the webhook endpoint (step 3). |
| `RESEND_API_KEY` | secret | for email | Resend API key. |
| `NOTIFICATION_FROM_EMAIL` | config | for email | Verified sender, e.g. `TechStore <no-reply@yourdomain>`. |
| `SELLER_NAME` / `SELLER_GSTIN` / `SELLER_ADDRESS` | config | recommended | Printed on GST invoices; each falls back to a placeholder. |

**Auth is auto-flip:** set **all six** Firebase vars and the app authenticates
via Firebase (client sign-in → server-verified session cookie); leave any unset
and it falls back to the custom-JWT path (`AUTH_SECRET`). So you can deploy on the
fallback first and switch to Firebase later just by adding the vars and
redeploying — no code change. Enabling Firebase also needs, in the Firebase
Console: **Authentication → Sign-in method → Email/Password = enabled**, and your
domain added under **Authentication → Settings → Authorized domains**.

Each gateway/service is **independent**: if Stripe keys are absent the "Pay by
card" option simply doesn't appear, if Cloudinary is absent uploads fall back to
local disk (which is *ephemeral on Vercel* — so configure Cloudinary before
relying on uploads in production), and so on. Nothing hard-fails for a missing
optional integration.

---

## Step-by-step

### 1. MongoDB Atlas
1. Create a free **M0** cluster. Pick a region close to your users and **note
   it** — you'll match Vercel's function region to it in step 6.
2. Create a **database user** (not your Atlas login). URL-encode the password.
3. **Network Access → Add IP → `0.0.0.0/0`.** Vercel serverless functions have
   no fixed egress IPs, so you must allow all (or use Vercel's static-IP /
   PrivateLink options on a paid plan). This is the #1 "why can't it connect"
   gotcha.
4. Connect → Drivers → copy the `mongodb+srv://...` string, insert the user +
   password, and append the db name (`/techstore`). → `MONGODB_URI`.

### 2. Cloudinary
Dashboard → Product Environment Credentials. Copy **cloud name**
(`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`), **API key** (`CLOUDINARY_API_KEY`), and
**API secret** (`CLOUDINARY_API_SECRET`). The app already uses **signed**
uploads, so no unsigned preset is needed.

### 3. Stripe
1. Developers → API keys: copy the **publishable** (`pk_...` →
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) and **secret** (`sk_...` →
   `STRIPE_SECRET_KEY`) keys. Use **live** keys for production.
2. *After the first deploy* (you need the domain): Developers → Webhooks → Add
   endpoint → `https://<your-domain>/api/payments/stripe/webhook`. Subscribe to
   **`checkout.session.completed`** (and optionally `payment_intent.succeeded`).
   Copy the **signing secret** (`whsec_...` → `STRIPE_WEBHOOK_SECRET`) and
   redeploy.

### 4. Razorpay
Settings → API Keys (use **live** keys in production). Copy **Key ID**
(`RAZORPAY_KEY_ID`) and **Key Secret** (`RAZORPAY_KEY_SECRET`).

### 5. Resend
API Keys → copy the key (`RESEND_API_KEY`). Verify your sending domain (its DNS
records go in Cloudflare, step 7). Set `NOTIFICATION_FROM_EMAIL` to a verified
address.

### 6. Vercel
1. **Import** the GitHub repo. Framework is auto-detected as Next.js;
   [`vercel.json`](vercel.json) pins the install (`npm ci`) and build
   (`next build`) commands, and [`.nvmrc`](.nvmrc) + `engines` pin **Node 20**
   (matching CI).
2. **Settings → Environment Variables:** add everything from the table above for
   **Production** (and **Preview** if you want branch URLs to be functional).
3. Set `NEXT_PUBLIC_SITE_URL` to the Vercel URL for now; update it after the
   custom domain is attached (step 7).
4. **Settings → Functions → Region:** set it to match your Atlas region (step 1)
   to keep DB latency low.
5. **Deploy.** Preview deployments per branch are on by default (every PR gets a
   test URL).

### 7. Cloudflare (custom domain)
1. In **Vercel → Settings → Domains**, add your domain; Vercel shows the DNS
   target.
2. In **Cloudflare → DNS**, add the record Vercel specifies (usually a `CNAME`
   to `cname.vercel-dns.com`, or an `A`/`AAAA` per Vercel's instructions).
   Follow Vercel's proxy guidance (often "DNS only" / grey-cloud to start).
3. Add Resend's domain-verification DNS records here too (step 5).
4. Once live, **update** `NEXT_PUBLIC_SITE_URL` to the final domain **and** the
   Stripe webhook endpoint URL (step 3), then redeploy.

---

## Post-deploy verification

- [ ] Home page and product listing load (proves Atlas connectivity, or the seed
      fallback if `MONGODB_URI` is unset).
- [ ] Sign up, log in, log out.
- [ ] An `ADMIN_EMAILS` account can open `/admin`.
- [ ] Place a **COD** order → order appears under the account.
- [ ] **Stripe** test/live card → redirects to Stripe → returns to `/order/...`;
      confirm the Stripe dashboard shows the event **and** the order flips to
      *paid* (the webhook did its job).
- [ ] **Razorpay** test/live payment completes and verifies.
- [ ] Admin product image upload lands on Cloudinary (URL is `res.cloudinary.com`).
- [ ] `https://<domain>/robots.txt` and `/sitemap.xml` show the real domain.
- [ ] An order **invoice** shows your real `SELLER_*` details.

---

## Notes & gotchas

- **Secrets** live only in Vercel env vars and your local `.env`. `NEXT_PUBLIC_*`
  and publishable/key-id values are public **by design** — they're meant to reach
  the browser; security lives server-side (signatures, rules), not in hiding them.
- **Vercel filesystem is ephemeral.** Anything written to disk at runtime (the
  local KYC-upload fallback) does not persist — configure Cloudinary so uploads
  go to the CDN instead.
- **Node 20** is pinned to match CI. Bumping it means updating `.nvmrc`,
  `package.json` `engines`, and `.github/workflows/ci.yml` together.
- Payment routes (`/api/orders`, `/api/payments/verify`,
  `/api/payments/stripe/webhook`) set `maxDuration = 30` so a cold start plus a
  slow upstream can't cut off a payment mid-flight.
- **Auth is Firebase-or-fallback.** With the six Firebase vars set, sign-in is
  Firebase (client SDK → httpOnly session cookie verified by the Admin SDK in
  Node; the Edge middleware only checks cookie presence, and the Node
  layouts/handlers remain the authoritative admin/vendor/wholesaler gate).
  Existing users are linked to their Firebase identity **by email** on first
  sign-in — so the admin account keeps admin (via `ADMIN_EMAILS`) by registering
  the same email in Firebase. Without the Firebase vars, the legacy
  `AUTH_SECRET` custom-JWT auth runs instead; keep that secret stable (rotating
  it logs everyone out).
