"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartLink() {
  const { totals, ready } = useCart();
  const count = totals.count;

  return (
    <Link
      href="/cart"
      className="relative flex items-end gap-1 rounded border border-transparent px-2 py-1.5 text-white hover:border-white"
    >
      <span className="relative">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={1.6}>
          <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 5M7 13l-2 4h12" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
        </svg>
        {ready && count > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-sm font-bold text-amz-orange">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden pb-0.5 text-sm font-bold sm:inline">Cart</span>
    </Link>
  );
}
