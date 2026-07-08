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
- 🏬 **Wholesale + retail (B2B/B2C)** — the same catalog sells both ways. **Public volume breaks** (buy 5/10/50+ at a lower unit price, visible to everyone) **plus** an **approved-wholesaler tier** (contract price + minimum order quantity). Buyers apply at `/business`; an admin approves them at `/admin/wholesale`. Every unit price and the buyer's wholesaler status are **resolved server-side** from the session + catalog — the client can display prices but can never set them, fake wholesaler status, or bypass the MOQ (all re-checked at order time). Discover eligible products with the **“Bulk & wholesale” filter** on `/products`
- 🧾 **B2B checkout & operations** — approved wholesalers get a **wholesaler dashboard** (`/business`) with reorder, a **Net-30 credit** payment option + **PO number**, and **request-a-quote** at checkout (all server-gated to approved accounts). Admins get a **bulk-pricing editor** (`/admin/pricing`) to set volume tiers / wholesale price / MOQ / GST across the catalog inline
- 🧮 **GST tax invoices** — per-product GST rate (prices GST-inclusive); every order has a printable **tax invoice** (`/order/[id]/invoice`) with seller & buyer GSTIN, per-line taxable value, and a CGST/SGST breakup
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
