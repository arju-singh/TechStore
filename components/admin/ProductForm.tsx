"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, Product } from "@/lib/types";

interface Props {
  mode: "create" | "edit";
  categories: Category[];
  initial?: Product;
  /** API base for create (POST) / edit (PUT `${basePath}/${slug}`). */
  basePath?: string;
  /** Where to return after a successful save. */
  listPath?: string;
}

function specsToText(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function tiersToText(tiers?: { minQty: number; unitPrice: number }[]): string {
  return (tiers ?? []).map((t) => `${t.minQty}: ${t.unitPrice}`).join("\n");
}

export default function ProductForm({
  mode,
  categories,
  initial,
  basePath = "/api/admin/products",
  listPath = "/admin/products",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    brand: initial?.brand ?? "",
    category: initial?.category ?? categories[0]?.slug ?? "",
    description: initial?.description ?? "",
    mrp: initial?.mrp?.toString() ?? "",
    price: initial?.price?.toString() ?? "",
    image: initial?.image ?? "",
    stock: initial?.stock?.toString() ?? "0",
    rating: initial?.rating?.toString() ?? "0",
    numReviews: initial?.numReviews?.toString() ?? "0",
    featured: initial?.featured ?? false,
    specs: initial ? specsToText(initial.specs) : "",
    priceTiers: tiersToText(initial?.priceTiers),
    wholesaleEnabled: initial?.wholesale?.enabled ?? false,
    wholesaleUnitPrice: initial?.wholesale?.unitPrice?.toString() ?? "",
    wholesaleMoq: initial?.wholesale?.moq?.toString() ?? "",
    gstRate: (initial?.gstRate ?? 18).toString(),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        mrp: Number(form.mrp),
        price: Number(form.price),
        stock: Number(form.stock),
        rating: Number(form.rating),
        numReviews: Number(form.numReviews),
        // priceTiers stays a "minQty: unitPrice" string — the server parses it.
        priceTiers: form.priceTiers,
        wholesale: {
          enabled: form.wholesaleEnabled,
          unitPrice: Number(form.wholesaleUnitPrice),
          moq: Number(form.wholesaleMoq),
        },
        gstRate: Number(form.gstRate),
      };
      const url =
        mode === "create" ? basePath : `${basePath}/${initial!.slug}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save product.");
      router.push(listPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Text label="Name" value={form.name} onChange={(v) => set("name", v)} required />
        <Text
          label="Slug"
          value={form.slug}
          onChange={(v) => set("slug", v)}
          placeholder="auto-generated from name if blank"
          hint={mode === "edit" ? "Slug can't be changed after creation." : undefined}
          disabled={mode === "edit"}
        />
        <Text label="Brand" value={form.brand} onChange={(v) => set("brand", v)} required />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white/70">Category</span>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Text label="MRP (₹)" value={form.mrp} onChange={(v) => set("mrp", v)} type="number" required />
        <Text label="Selling price (₹)" value={form.price} onChange={(v) => set("price", v)} type="number" required />
        <Text label="Stock" value={form.stock} onChange={(v) => set("stock", v)} type="number" required />
        <Text label="Image URL" value={form.image} onChange={(v) => set("image", v)} placeholder="https://…" required />
        <Text label="Rating (0–5)" value={form.rating} onChange={(v) => set("rating", v)} type="number" />
        <Text label="Reviews count" value={form.numReviews} onChange={(v) => set("numReviews", v)} type="number" />
        <Text label="GST rate (%)" value={form.gstRate} onChange={(v) => set("gstRate", v)} type="number" hint="Prices are GST-inclusive. Default 18." />
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-white/70">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-white/70">
          Specifications
        </span>
        <span className="mb-1 block text-xs text-white/40">
          One per line as <code>Key: Value</code> — e.g. <code>RAM: 8GB</code>
        </span>
        <textarea
          value={form.specs}
          onChange={(e) => set("specs", e.target.value)}
          rows={5}
          placeholder={"Display: 6.5\" AMOLED\nBattery: 5000mAh"}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {/* Wholesale & bulk pricing */}
      <fieldset className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
        <legend className="px-2 text-sm font-semibold text-blue-800">
          Wholesale &amp; bulk pricing
        </legend>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white/70">
            Public volume tiers
          </span>
          <span className="mb-1 block text-xs text-white/40">
            One per line as <code>minQty: unitPrice</code> — e.g. <code>10: 599</code>.
            Visible to everyone; the price must be at or below the selling price and
            drop as quantity rises.
          </span>
          <textarea
            value={form.priceTiers}
            onChange={(e) => set("priceTiers", e.target.value)}
            rows={3}
            placeholder={"10: 599\n50: 499\n100: 429"}
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.wholesaleEnabled}
            onChange={(e) => set("wholesaleEnabled", e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-white/70">
            Offer a wholesale price to approved businesses
          </span>
        </label>

        {form.wholesaleEnabled && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Text
              label="Wholesale price (₹)"
              value={form.wholesaleUnitPrice}
              onChange={(v) => set("wholesaleUnitPrice", v)}
              type="number"
            />
            <Text
              label="Minimum order qty"
              value={form.wholesaleMoq}
              onChange={(v) => set("wholesaleMoq", v)}
              type="number"
            />
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => set("featured", e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        <span className="text-sm text-white/70">Feature on homepage</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(listPath)}
          className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-white/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        step={type === "number" ? "any" : undefined}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100 disabled:bg-white/10 disabled:text-white/40"
      />
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}
