import Link from "next/link";
import { Suspense } from "react";
import { getCategories } from "@/lib/products";
import SearchBar from "./SearchBar";
import CartLink from "./CartLink";
import AccountMenu from "./AccountMenu";
import WishlistLink from "./WishlistLink";

export default async function Navbar() {
  const categories = await getCategories();

  return (
    <header id="top" className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-xl">
      {/* Main bar */}
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-white">
          Tech<span className="text-brand-400">Store</span>
        </Link>

        <div className="flex-1">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="flex items-center gap-1 text-sm">
          <AccountMenu />
          <WishlistLink />
          <CartLink />
        </nav>
      </div>

      {/* Category / links row */}
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-4 py-2 text-sm sm:px-6">
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            <Link
              href="/products"
              className="whitespace-nowrap rounded-full px-3 py-1 text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="whitespace-nowrap rounded-full px-3 py-1 text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/stores"
              className="whitespace-nowrap rounded-full px-3 py-1 text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Stores
            </Link>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              href="/vendor/apply"
              className="hidden whitespace-nowrap rounded-full px-3 py-1 text-white/60 transition hover:text-white sm:block"
            >
              Sell
            </Link>
            <Link
              href="/become-a-wholesaler"
              className="whitespace-nowrap rounded-full border border-brand-400/40 px-3 py-1 font-medium text-brand-300 transition hover:bg-brand-400/10"
            >
              Wholesale
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
