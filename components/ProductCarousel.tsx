"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductCarousel({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: Product[];
}) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-sm font-medium text-amz-link hover:text-amz-linkH hover:underline"
          >
            See all
          </Link>
        )}
      </div>

      {/* overflow-x-clip contains the horizontal-scroll rail so it can't leak its
          content width to the page (which caused a right-side gap / horizontal
          scroll on wide viewports). The nav buttons sit flush at the edges so the
          clip doesn't cut them. */}
      <div className="relative overflow-x-clip">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-amz-border bg-white shadow-amz hover:bg-amz-bg sm:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
            <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={railRef}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth"
        >
          {products.map((p) => (
            <div key={p.slug} className="w-40 shrink-0 sm:w-48">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-amz-border bg-white shadow-amz hover:bg-amz-bg sm:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
