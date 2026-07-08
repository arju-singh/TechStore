"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";

export default function WishlistLink() {
  const { count, ready } = useWishlist();

  return (
    <Link
      href="/wishlist"
      className="relative hidden items-center gap-1 rounded border border-transparent px-2 py-1.5 text-white hover:border-white sm:flex"
    >
      <span className="relative">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.7}>
          <path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.5 5.6 4.5c2 0 3.3 1.1 4.4 2.6 1.1-1.5 2.4-2.6 4.4-2.6 3.6 0 5.2 3.9 3.6 7.2C19.5 16.1 12 21 12 21Z" strokeLinejoin="round" />
        </svg>
        {ready && count > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amz-orange px-1 text-[10px] font-bold text-ink">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="text-sm font-medium">Wishlist</span>
    </Link>
  );
}
