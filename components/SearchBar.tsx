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
      className={`flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition focus-within:border-white/30 focus-within:bg-white/[0.07] ${className}`}
      role="search"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-white/40" stroke="currentColor" strokeWidth={2.2}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search phones, laptops, audio…"
        aria-label="Search products"
        className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
      />
      <button type="submit" aria-label="Search" className="sr-only">
        Search
      </button>
    </form>
  );
}
