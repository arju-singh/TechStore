"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";

const QUICK_LINKS: [string, string][] = [
  ["Just arrived", "/products?sort=featured"],
  ["Today's deals", "/products?sort=discount"],
  ["Bestsellers", "/products?sort=rating"],
  ["Under ₹10,000", "/products?maxPrice=10000"],
  ["Premium flagships", "/products?minPrice=50000"],
];

export default function CategoriesMenu({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded border border-transparent px-2 py-1 font-bold hover:border-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
        All
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-0 w-[34rem] max-w-[92vw] overflow-hidden rounded-b-lg border border-amz-border bg-white text-ink shadow-amz"
        >
          <div className="grid grid-cols-2 gap-0">
            {/* Categories */}
            <div className="border-r border-amz-border p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amz-borderdark">
                Shop by category
              </p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/products?category=${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-amz-bg"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-amz-borderdark">
                        {counts[c.slug] ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div className="p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amz-borderdark">
                Trending
              </p>
              <ul className="space-y-0.5">
                {QUICK_LINKS.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className="block rounded px-2 py-1.5 text-sm font-medium text-amz-link hover:bg-amz-bg hover:text-amz-linkH"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
