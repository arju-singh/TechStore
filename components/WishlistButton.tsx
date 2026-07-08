"use client";

import type { Product } from "@/lib/types";
import { useWishlist } from "@/lib/wishlist";

export default function WishlistButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { has, toggle, ready } = useWishlist();
  const active = ready && has(product.slug);

  function onClick(e: React.MouseEvent) {
    // The card is a <Link>; don't navigate when toggling the heart.
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  }

  return (
    <button
      onClick={onClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-amz-border bg-white/90 shadow-soft transition hover:scale-110 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 transition ${active ? "fill-amz-deal text-amz-deal" : "fill-none text-ink/50"}`}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.5 5.6 4.5c2 0 3.3 1.1 4.4 2.6 1.1-1.5 2.4-2.6 4.4-2.6 3.6 0 5.2 3.9 3.6 7.2C19.5 16.1 12 21 12 21Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
