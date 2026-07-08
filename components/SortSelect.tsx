"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "discount", label: "Discount" },
];

export default function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    if (e.target.value === "featured") next.delete("sort");
    else next.set("sort", e.target.value);
    router.push(`/products?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
