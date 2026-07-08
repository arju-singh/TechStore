# TechStore

A modern e-commerce storefront built with **Next.js (App Router)**, **Tailwind CSS**, and **MongoDB / Mongoose**. This is the **storefront foundation** — a running, browsable store with a seeded catalog.

## What's built so far

- 🏠 **Home page** — hero banner, shop-by-category grid, top deals (by discount), and featured products
- 🗂️ **Product listing** (`/products`) — category filter sidebar, keyword search, and sorting (price, rating, discount)
- 🔎 **Search** — from the navbar, across name / brand / description / category
- 📄 **Product detail** (`/product/[slug]`) — image, INR pricing with MRP-vs-selling discount, stock, quantity selector, add-to-cart / buy-now, spec table, related products
- 🛒 **Cart** (`/cart`) — React Context state with **localStorage persistence**, line items with quantity controls & remove, live navbar badge, order summary (subtotal, discount, free-delivery threshold, total)
- 🔐 **Auth** (`/login`, `/signup`, `/account`) — JWT sessions in **httpOnly cookies**, bcrypt password hashing, protected account page, navbar account menu. Works out of the box via an **in-memory user store** when no database is set (resets on restart)
- 📦 **Checkout & orders** (`/checkout`, `/order/[id]`, `/account/orders`) — auth-gated checkout, **server-side price validation** (client prices are never trusted), address validation, order confirmation & history
- 💳 **Payments** — **Razorpay** online payment (create order → hosted checkout → **HMAC-SHA256 signature verification** → order marked paid) **and** Cash on Delivery. Test-mode keys via env
- 🛠️ **Admin panel** (`/admin`) — role-gated dashboard (stats, inventory alerts), product management (create / edit / delete), and order management (status updates). Access via `ADMIN_EMAILS`
- 📍 **Pincode delivery check** — serviceability + ETA lookup on product pages (`/api/delivery`), with metro/standard/remote tiers; checkout enforces serviceability and blocks COD where it isn't available
- 🏷️ **Coupon codes** — flat & percentage discounts with minimum-order thresholds (e.g. `SAVE500` = ₹500 off over ₹5,000). Applied in the cart, carried to checkout, and **re-validated server-side** at order time so discounts can't be faked
- 🏬 **Wholesale (B2B) — a distinct `WHOLESALER` role** — businesses register at `/become-a-wholesaler` (GST-validated, with **real document uploads**), an admin approves them under **Admin → Wholesalers**, and approved wholesalers get a dedicated **portal** (`/wholesale`): a tiered wholesale **catalog**, a **bulk cart** with server-verified pricing, a **B2B checkout** (Net-15/30 credit within an admin-set limit + GST invoice), **RFQ** quote negotiation with vendors, saved **order templates / CSV bulk upload / reorder**, **reward points**, and **membership tiers**. Vendors set per-product **wholesale tiers** (capped by an admin max-discount). Every price, discount, MOQ, and approval is **resolved and enforced server-side**; the module is **DB-only and fails loud** (it never fabricates wholesalers, pricing, approvals, documents, or notifications). Public volume breaks (`priceTiers`) still apply to everyone. See [Wholesale (B2B) module](#wholesale-b2b-module)
- 🧮 **GST tax invoices** — per-product GST rate (prices GST-inclusive); every order has a printable **tax invoice** (`/order/[id]/invoice`) with seller & buyer GSTIN, per-line taxable value, and a CGST/SGST breakup
- 🏪 **Multi-vendor marketplace** — independent vendors sell through the same storefront. Sellers apply at `/vendor/apply`, an admin approves them under **Admin → Stores**, and they get a **vendor portal** (`/vendor`) to manage their own products, orders, storefront and payouts. Shoppers see **“Sold by ⟨store⟩”** on products, browse per-seller storefronts at `/store/[slug]`, and a **`/stores` directory**. A mixed cart checks out as **one order with each line tagged to its vendor**; the platform earns a **commission** (global default + per-vendor override) and an admin settles **payouts** under **Admin → Payouts**. See [Multi-vendor marketplace](#multi-vendor-marketplace)
- 🔒 **Security hardening** — edge `middleware.ts` gating `/admin` & `/api/admin`, in-memory **rate limiting** on auth/order endpoints, `AUTH_SECRET` **hard-fail in production**, atomic **stock decrement** (no oversell under concurrent/bulk orders), regex-escaped search, order idempotency, and baseline **security headers / CSP**
- 💾 **Data layer** — Mongoose models + a **local seed fallback** so the store renders even with no database configured

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it — with no database configured, the store renders from the local sample catalog in `data/seed.ts`. **No MongoDB required to browse.**

> Note: port 3000 may already be in use on your machine. Run on another port with `PORT=3100 npm run dev`.

> **Location note:** this project was moved to `~/dev/techstore` (off the
> iCloud-synced Desktop) because iCloud was corrupting Next's build output and
> making `next build`/`next dev` extremely slow — after the move, a clean build
> runs in ~10s and the server starts in <200ms. The build output still uses
> `distDir: build.nosync/.next` (`next.config.mjs`); that's now optional since
> the project is no longer synced, but it's harmless to keep. Don't move this
> project back under `~/Desktop` or `~/Documents` if iCloud "Desktop &
> Documents" sync is on.

## Database (MongoDB)

A local MongoDB is wired up and `MONGODB_URI` is set in `.env.local`, so the app
persists products, users, and orders to the database. When `MONGODB_URI` is
empty, everything automatically falls back to the in-memory / `data/seed.ts`
store (which resets on restart).

Local MongoDB was installed via Homebrew and runs as a background service:

```bash
brew services start mongodb-community   # start (auto-starts at login)
brew services stop mongodb-community    # stop
npm run seed                            # (re)load the sample catalog into Mongo
```

Because the catalog is now backed by a live, admin-editable database, the
catalog pages render **dynamically** (`export const dynamic = "force-dynamic"`
in `app/layout.tsx`) rather than being prerendered at build time — so admin
edits show immediately, and the build doesn't open DB connections that would
stall it.

## Admin access

The admin panel lives at `/admin`. Any signed-up user whose email is listed in
the `ADMIN_EMAILS` env var (comma-separated) is automatically elevated to admin
— no database change needed. Set it in `.env.local`, sign up with that email,
and the account menu will show an **Admin panel** link.

```
ADMIN_EMAILS=you@example.com,teammate@example.com
```

## Multi-vendor marketplace

TechStore runs as a **marketplace**: alongside first-party ("house") products,
independent vendors list and sell their own catalog through the same storefront.

**Three surfaces**

- **Storefront (shopper-facing)** — products show **“Sold by ⟨store⟩”**; each
  approved seller has a public storefront at `/store/[slug]`; browse all sellers
  at `/stores`; filter the listing by store on `/products`.
- **Vendor portal (`/vendor`)** — a seller's back office. Apply at
  `/vendor/apply` → an admin approves → the seller manages their own **products**,
  **orders** (with per-line fulfillment), **store settings**, and a read-only
  **payouts** ledger. Every vendor write is ownership-checked server-side, so a
  vendor can only ever touch their own products and order lines.
- **Admin → Stores & Payouts** — approve / suspend / reject vendors, set a
  per-vendor **commission override**, and settle **payouts** (net of commission).

**How orders & money work**

- A cart may mix items from several vendors (and house products). It checks out
  as **one order**; each line is stamped at purchase time with its `vendorSlug`
  and a **commission snapshot**, so the existing Razorpay / COD flow, atomic
  stock decrement, and GST invoice are all preserved unchanged.
- A vendor's **earnings** = the sum of their lines in settled orders; the
  platform's **commission** is that vendor's rate (override, else
  `PLATFORM_COMMISSION_RATE`, default 10%) applied to gross. **Payable** = net
  earned − already paid out. Payouts are **accounting only** — no real transfer.

**Becoming a seller (demo)**

1. Sign up, then go to **Sell on TechStore** (navbar) → `/vendor/apply`.
2. As an admin (`ADMIN_EMAILS`), open **Admin → Stores** and approve it.
3. The store is now live: add products in the vendor portal — they appear on the
   storefront with the right "Sold by", and sales flow into **Admin → Payouts**.

With no database, three demo stores (Gadget Galaxy, SoundStage Audio, SnapGear
Cameras) are seeded from `data/seed.ts` so the marketplace is populated out of
the box. With a database, `npm run seed` loads them too.

## Wholesale (B2B) module

TechStore's B2B side is a **distinct `WHOLESALER` role** — modeled like the vendor
role: a `WholesalerProfile` entity owned by a user, where "being a wholesaler" =
owning an **approved** profile (resolved fresh each request, never trusted from the
JWT). It replaces the old `accountType`-flag approach.

**Hard rule — the wholesale module is DB-only and fails loud.** Unlike the rest of
the app (which falls back to an in-memory seed with no `MONGODB_URI`), every
wholesale route/lib requires a database and throws a clear error otherwise. It
never fabricates wholesalers, pricing, approvals, documents, or notifications, and
rejects bad input with specific messages ("tax number invalid", "MOQ not met",
"discount exceeds platform cap", "credit limit exceeded", "wholesale module
disabled").

**Flow**

1. **Register** at `/become-a-wholesaler` — business details + a **GST-format-
   validated** tax number + **real document uploads** (stored on disk under
   `WHOLESALE_UPLOAD_DIR`; admins review them via an authenticated download).
2. **Admin → Wholesalers** — approve / reject / request-docs / suspend / blacklist
   (with a reason). Every decision sends a **real notification** (in-app, and email
   too if `RESEND_API_KEY` is set — never a fake "sent"). **Admin → Wholesale
   settings** holds the master toggle, max-discount cap, wholesale commission %, and
   default credit days. **Admin → Wholesale orders / analytics** show the retail-vs-
   B2B revenue split, top buyers/vendors/products, and CSV export.
3. **Vendors** set per-product **wholesale tiers** (`min/max qty → unit price`,
   validated against the admin cap) under **Vendor → Wholesale pricing**, and answer
   **RFQs** (accept / reject / counter) under **Vendor → Quotes**.
4. **Wholesalers** (`/wholesale`) browse the tiered **catalog**, use the **bulk
   cart** (`/api/wholesale/cart/calculate` is server-authoritative), and **checkout**
   (`/api/wholesale/orders` re-resolves every price, enforces MOQ + cap + module
   toggle + credit limit, reserves stock atomically, and stamps `orderType:
   "wholesale"`). They can **request quotes**, then **convert** an accepted/countered
   RFQ into an order at the agreed price; save **order templates**, **bulk-upload a
   CSV**, and **reorder**; earn **reward points** (1 per ₹100); and pick a
   **membership tier** (extra catalog discount applied server-side).

**Key entities:** `WholesalerProfile`, `WholesaleSettings`, `WholesaleRfq`,
`WholesaleCreditTerm`, `Notification`, `LoyaltyTransaction`,
`MembershipSubscription`, `OrderTemplate`; plus `Product.wholesale.tiers` and
`Order.orderType`.

**Migrating** an existing `accountType`-based install:

```bash
npm run migrate:wholesale   # converts legacy wholesale users → WholesalerProfile
```

## Project structure

```
app/
  layout.tsx              # root layout: navbar + footer
  page.tsx                # home
  products/page.tsx       # listing: filter + search + sort
  product/[slug]/page.tsx # product detail
  cart/page.tsx           # cart placeholder
  not-found.tsx           # 404
app/api/auth/             # signup, login, logout, me route handlers
components/                # Navbar, CartLink, AccountMenu, Footer, ProductCard, ProductPurchase, CartView, AuthForm, SearchBar, SortSelect, PriceTag, Stars
lib/
  mongodb.ts              # cached Mongoose connection + hasDatabase flag
  models/                 # Product, Category, User schemas
  products.ts             # product data access with seed fallback
  users.ts                # user store: Mongo or in-memory fallback
  auth.ts                 # server: bcrypt + jose JWT + cookie session (getCurrentUser)
  authClient.tsx          # AuthProvider / useAuth (client)
  cart.tsx                # CartProvider / useCart — Context + localStorage
  validation.ts           # signup/login field validation
  format.ts               # INR currency formatting
  types.ts                # Product / Category types
data/seed.ts              # sample catalog (source of truth for seed + fallback)
scripts/seed.ts           # `npm run seed` — loads catalog into MongoDB
```

## Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start the dev server                     |
| `npm run build` | Production build                         |
| `npm run start` | Run the production build                 |
| `npm run seed`  | Seed MongoDB with the sample catalog     |
| `npm run lint`  | Lint                                     |

## Roadmap (next milestones)

Building on this foundation, in rough order:

1. ~~**Cart** — Context state, add/remove/update, persistent~~ ✅ done
2. ~~**Auth** — signup/login with JWT~~ ✅ done
3. ~~**Checkout & orders** — address, order creation & history (COD)~~ ✅ done
4. ~~**Payments** — Razorpay + COD~~ ✅ done
5. ~~**Pincode delivery check** on product & checkout~~ ✅ done
6. ~~**Discounts / offers** — coupon codes on top of MRP-vs-price~~ ✅ done
7. ~~**Admin panel** — manage products & orders~~ ✅ done

**All roadmap items are complete.** 🎉

---

Demo storefront — sample data only, not a real shop.
# TechStore
