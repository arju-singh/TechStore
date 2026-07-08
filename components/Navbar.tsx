import Link from "next/link";
import { Suspense } from "react";
import { getCategories, getCategoryCounts } from "@/lib/products";
import SearchBar from "./SearchBar";
import CartLink from "./CartLink";
import AccountMenu from "./AccountMenu";
import WishlistLink from "./WishlistLink";
import CategoriesMenu from "./CategoriesMenu";

export default async function Navbar() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);

  return (
    <header id="top" className="sticky top-0 z-40">
      {/* Utility strip */}
      <div className="bg-amz-footerdark text-white/80">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-amz-orange" stroke="currentColor" strokeWidth={1.8}>
              <path d="M4 5a2 2 0 0 1 2-2h1.6a1 1 0 0 1 .95.68l1 3a1 1 0 0 1-.27 1.06L9 9a12 12 0 0 0 6 6l1.26-1.28a1 1 0 0 1 1.06-.27l3 1a1 1 0 0 1 .68.95V17a2 2 0 0 1-2 2A16 16 0 0 1 4 5Z" strokeLinejoin="round" />
            </svg>
            +91 98765 43210
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-amz-orange" stroke="currentColor" strokeWidth={1.8}>
              <path d="M4 6h16v12H4z" strokeLinejoin="round" />
              <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            care@techstore.in
          </span>
          <span className="hidden md:inline">9:00 AM – 7:00 PM</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline">Get the app:</span>
            <span className="rounded border border-white/25 px-2 py-0.5 text-[11px] font-medium">📱 Android</span>
            <span className="rounded border border-white/25 px-2 py-0.5 text-[11px] font-medium"> iOS</span>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="bg-amz-navy text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-3 py-2 sm:gap-3">
          <Link
            href="/"
            className="shrink-0 rounded border border-transparent px-2 py-1.5 hover:border-white"
          >
            <span className="font-display text-xl font-bold tracking-tight">
              Tech<span className="text-amz-orange">Store</span>
              <span className="text-amz-orange">.in</span>
            </span>
          </Link>

          {/* Deliver to */}
          <div className="hidden shrink-0 items-center gap-1 rounded border border-transparent px-2 py-1.5 text-xs hover:border-white lg:flex">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 21s-7-5.2-7-10a7 7 0 1 1 14 0c0 4.8-7 10-7 10Z" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="2.5" />
            </svg>
            <div className="leading-tight">
              <div className="text-white/70">Deliver to</div>
              <div className="font-bold">India</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1">
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>

          <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
            <AccountMenu />
            <Link
              href="/account/orders"
              className="hidden rounded border border-transparent px-2 py-1.5 leading-tight hover:border-white md:block"
            >
              <span className="block text-xs text-white/80">Returns</span>
              <span className="block font-bold">&amp; Orders</span>
            </Link>
            <WishlistLink />
            <CartLink />
          </nav>
        </div>
      </div>

      {/* Sub bar — categories */}
      <div className="bg-amz-navy2 text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-3 py-1.5 text-sm">
          {/* Kept OUT of the overflow-x container so the dropdown isn't clipped */}
          <CategoriesMenu categories={categories} counts={counts} />
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="whitespace-nowrap rounded border border-transparent px-2 py-1 hover:border-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
          <Link
            href="/business"
            className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-blue-600/90 px-3 py-1 font-semibold text-white hover:bg-blue-600"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={1.8}>
              <path d="M3 9h18M3 9l1.5-4.5A2 2 0 0 1 6.4 3h11.2a2 2 0 0 1 1.9 1.5L21 9M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" strokeLinejoin="round" />
            </svg>
            For Business
          </Link>
        </div>
      </div>
    </header>
  );
}
