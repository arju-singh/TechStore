"use client";

import { useEffect, useMemo, useState } from "react";
import { formatINR } from "@/lib/format";
import { flashSaleStatus } from "@/lib/flashSaleShared";
import type { FlashSale, FlashSaleItem, FlashSaleStatus } from "@/lib/flashSaleShared";

interface ProductLite {
  slug: string;
  name: string;
  price: number;
}

const STATUS_STYLE: Record<FlashSaleStatus, string> = {
  active: "bg-green-500/10 text-green-400",
  scheduled: "bg-blue-500/10 text-blue-400",
  ended: "bg-white/10 text-white/50",
  disabled: "bg-amber-500/10 text-amber-400",
};

/** ISO → value for <input type="datetime-local"> (local wall-clock, YYYY-MM-DDTHH:mm). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fmtWindow(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface FormState {
  title: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  enabled: boolean;
  items: FlashSaleItem[];
}

const EMPTY_FORM: FormState = { title: "", startsAt: "", endsAt: "", enabled: true, items: [] };

export default function FlashSaleManager({
  initialSales,
  products,
}: {
  initialSales: FlashSale[];
  products: ProductLite[];
}) {
  const [sales, setSales] = useState<FlashSale[]>(initialSales);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const productBySlug = useMemo(
    () => new Map(products.map((p) => [p.slug, p])),
    [products]
  );

  // Set the clock + create-mode defaults after mount (avoids SSR/time mismatch).
  useEffect(() => {
    setNow(Date.now());
    if (editingId === null && !form.startsAt) resetToCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetToCreate() {
    const start = new Date();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    setEditingId(null);
    setForm({
      title: "",
      startsAt: isoToLocalInput(start.toISOString()),
      endsAt: isoToLocalInput(end.toISOString()),
      enabled: true,
      items: [],
    });
    setError(null);
  }

  function startEdit(sale: FlashSale) {
    setEditingId(sale.id);
    setForm({
      title: sale.title,
      startsAt: isoToLocalInput(sale.startsAt),
      endsAt: isoToLocalInput(sale.endsAt),
      enabled: sale.enabled,
      items: sale.items.map((i) => ({ ...i })),
    });
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addItem() {
    const used = new Set(form.items.map((i) => i.slug));
    const next = products.find((p) => !used.has(p.slug));
    if (!next) return;
    setForm((f) => ({ ...f, items: [...f.items, { slug: next.slug, discountPct: 20 }] }));
  }
  function updateItem(idx: number, patch: Partial<FlashSaleItem>) {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  }
  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError("Give the sale a title.");
    if (!form.startsAt || !form.endsAt) return setError("Set a start and end time.");
    if (new Date(form.endsAt) <= new Date(form.startsAt)) return setError("End must be after start.");

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      enabled: form.enabled,
      items: form.items,
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/flash-sales/${editingId}` : "/api/admin/flash-sales",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save the sale.");
      const saved: FlashSale = data.sale;
      setSales((prev) =>
        editingId ? prev.map((s) => (s.id === editingId ? saved : s)) : [saved, ...prev]
      );
      resetToCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(sale: FlashSale) {
    setBusyId(sale.id);
    try {
      const res = await fetch(`/api/admin/flash-sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !sale.enabled }),
      });
      const data = await res.json();
      if (res.ok) setSales((prev) => prev.map((s) => (s.id === sale.id ? data.sale : s)));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(sale: FlashSale) {
    if (!confirm(`Delete the flash sale "${sale.title}"?`)) return;
    setBusyId(sale.id);
    try {
      const res = await fetch(`/api/admin/flash-sales/${sale.id}`, { method: "DELETE" });
      if (res.ok) {
        setSales((prev) => prev.filter((s) => s.id !== sale.id));
        if (editingId === sale.id) resetToCreate();
      }
    } finally {
      setBusyId(null);
    }
  }

  const anyActive = now !== null && sales.some((s) => flashSaleStatus(s, now) === "active");

  return (
    <div className="space-y-8">
      {/* Create / edit form */}
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-bold text-white">
          {editingId ? "Edit flash sale" : "Create flash sale"}
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-white/70">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekend Lightning Deals"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/70">Starts</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 [color-scheme:dark]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/70">Ends</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 [color-scheme:dark]"
            />
          </label>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="h-4 w-4 accent-brand-400"
          />
          Enabled (a disabled sale never applies, even inside its window)
        </label>

        {/* Items */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">Discounted products</span>
            <button
              type="button"
              onClick={addItem}
              disabled={form.items.length >= products.length}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-40"
            >
              + Add product
            </button>
          </div>

          {form.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
              No products yet. Add products and set each one&apos;s discount.
            </p>
          ) : (
            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const p = productBySlug.get(item.slug);
                const sale = p ? Math.max(1, Math.round(p.price * (1 - item.discountPct / 100))) : 0;
                return (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <select
                      value={item.slug}
                      onChange={(e) => updateItem(idx, { slug: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 [color-scheme:dark]"
                    >
                      {products.map((prod) => (
                        <option key={prod.slug} value={prod.slug}>
                          {prod.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={item.discountPct}
                        onChange={(e) => updateItem(idx, { discountPct: Number(e.target.value) })}
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white outline-none focus:border-white/30"
                      />
                      <span className="text-sm text-white/40">% off</span>
                    </div>
                    {p && (
                      <span className="text-xs text-white/50">
                        {formatINR(p.price)} → <span className="font-semibold text-brand-300">{formatINR(sale)}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      aria-label="Remove product"
                      className="ml-auto rounded-lg px-2 py-1 text-xs text-white/40 transition hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : editingId ? "Save changes" : "Create sale"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetToCreate}
              className="text-sm font-medium text-white/50 transition hover:text-white"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {/* Storefront-fallback note */}
      {!anyActive && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200/90">
          No sale is active right now, so the storefront shows the built-in demo sale
          (&ldquo;Lightning Deals&rdquo;). Creating and enabling a sale here replaces it.
        </div>
      )}

      {/* Existing sales */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-white">
          Flash sales <span className="text-sm font-normal text-white/40">({sales.length})</span>
        </h2>
        {sales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/50">
            No flash sales yet. Create one above.
          </div>
        ) : (
          <ul className="space-y-3">
            {sales.map((sale) => {
              const status = now !== null ? flashSaleStatus(sale, now) : null;
              return (
                <li
                  key={sale.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{sale.title}</span>
                        {status && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[status]}`}>
                            {status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {fmtWindow(sale.startsAt)} → {fmtWindow(sale.endsAt)} · {sale.items.length}{" "}
                        {sale.items.length === 1 ? "product" : "products"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => toggleEnabled(sale)}
                        disabled={busyId === sale.id}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        {sale.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => startEdit(sale)}
                        disabled={busyId === sale.id}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(sale)}
                        disabled={busyId === sale.id}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
