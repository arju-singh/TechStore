"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");

  // Keep the input in sync with the URL when landing on /products?search=…
  useEffect(() => {
    setQ(params.get("search") ?? "");
  }, [params]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
  }

  return (
    <form
      onSubmit={submit}
      className={`flex overflow-hidden rounded-md text-ink focus-within:ring-2 focus-within:ring-amz-orange ${className}`}
      role="search"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search TechStore.in"
        aria-label="Search products"
        className="w-full bg-white px-3 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex w-12 shrink-0 items-center justify-center bg-amz-search text-ink transition hover:bg-amz-searchH"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
