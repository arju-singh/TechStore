"use client";

import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import PriceTag from "./PriceTag";

export default function WishlistView() {
  const { items, ready, remove, clear } = useWishlist();
  const { addItem } = useCart();

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-amz-borderdark sm:px-6">
        Loading your wishlist…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-soft">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-amz-deal" stroke="currentColor" strokeWidth={1.6}>
            <path d="M12 21s-7.5-4.9-10-9.3C.4 8.4 2 4.5 5.6 4.5c2 0 3.3 1.1 4.4 2.6 1.1-1.5 2.4-2.6 4.4-2.6 3.6 0 5.2 3.9 3.6 7.2C19.5 16.1 12 21 12 21Z" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-ink">Your wishlist is empty</h1>
        <p className="mt-2 max-w-md text-sm text-amz-borderdark">
          Tap the ♥ on any product to save it here for later.
        </p>
        <Link href="/products" className="btn-primary mt-6">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Your wishlist
          <span className="ml-2 text-base font-normal text-amz-borderdark">
            ({items.length})
          </span>
        </h1>
        <button
          onClick={clear}
          className="text-sm font-medium text-amz-link hover:text-amz-linkH hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const outOfStock = item.stock <= 0;
          return (
            <div key={item.slug} className="flex flex-col rounded-lg bg-white p-4 shadow-soft">
              <Link
                href={`/product/${item.slug}`}
                className="relative aspect-square w-full overflow-hidden"
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width:768px) 45vw, 220px"
                  className="object-contain"
                />
              </Link>
              <Link
                href={`/product/${item.slug}`}
                className="mt-3 line-clamp-2 text-sm font-medium text-ink hover:text-amz-linkH"
              >
                {item.name}
              </Link>
              <div className="mt-1">
                <PriceTag mrp={item.mrp} price={item.price} size="sm" />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => {
                    addItem({ ...item, category: "", description: "", rating: 0, numReviews: 0, featured: false, specs: {} }, 1);
                    remove(item.slug);
                  }}
                  disabled={outOfStock}
                  className="btn-primary w-full !py-2 text-xs"
                >
                  {outOfStock ? "Out of stock" : "Move to cart"}
                </button>
                <button
                  onClick={() => remove(item.slug)}
                  className="text-xs font-medium text-amz-link hover:text-amz-linkH hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
