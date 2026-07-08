"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface TierRow {
  minQty: string;
  maxQty: string;
  unitPrice: string;
}

export interface WholesaleConfigShape {
  enabled: boolean;
  moq: number;
  tiers?: { minQty: number; maxQty: number | null; unitPrice: number }[];
}

export default function WholesaleTierEditor({
  slug,
  price,
  initial,
}: {
  slug: string;
  price: number;
  initial: WholesaleConfigShape;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [moq, setMoq] = useState(String(initial.moq || 1));
  const [rows, setRows] = useState<TierRow[]>(
    (initial.tiers && initial.tiers.length > 0
      ? initial.tiers
      : [{ minQty: 10, maxQty: null, unitPrice: Math.round(price * 0.9) }]
    ).map((t) => ({
      minQty: String(t.minQty),
      maxQty: t.maxQty == null ? "" : String(t.maxQty),
      unitPrice: String(t.unitPrice),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setRow(i: number, key: keyof TierRow, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { minQty: "", maxQty: "", unitPrice: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/products/${slug}/wholesale-tiers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          moq: Number(moq) || 1,
          tiers: rows.map((r) => ({
            minQty: Number(r.minQty),
            maxQty: r.maxQty.trim() === "" ? null : Number(r.maxQty),
            unitPrice: Number(r.unitPrice),
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setMsg("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        {initial.enabled ? "Edit wholesale" : "Set wholesale pricing"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3">
      {error && <div className="mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {msg && <div className="mb-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{msg}</div>}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        Offer wholesale pricing on this product
      </label>

      {enabled && (
        <>
          <div className="mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white/50">
                  <th className="py-1 font-semibold">Min qty</th>
                  <th className="py-1 font-semibold">Max qty</th>
                  <th className="py-1 font-semibold">₹/unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1">
                      <input value={r.minQty} onChange={(e) => setRow(i, "minQty", e.target.value)} type="number" className={CELL} />
                    </td>
                    <td className="pr-2 py-1">
                      <input value={r.maxQty} onChange={(e) => setRow(i, "maxQty", e.target.value)} type="number" placeholder="∞" className={CELL} />
                    </td>
                    <td className="pr-2 py-1">
                      <input value={r.unitPrice} onChange={(e) => setRow(i, "unitPrice", e.target.value)} type="number" className={CELL} />
                    </td>
                    <td className="py-1">
                      <button onClick={() => removeRow(i)} className="text-white/40 hover:text-red-600">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} className="mt-1 text-xs font-medium text-brand-600 hover:underline">
              + Add tier
            </button>
          </div>

          <label className="mt-3 block text-xs">
            <span className="text-white/70">Minimum order quantity (MOQ)</span>
            <input value={moq} onChange={(e) => setMoq(e.target.value)} type="number" className={`${CELL} mt-1 w-24`} />
          </label>
          <p className="mt-1 text-[11px] text-white/40">Retail price: ₹{price}. Discounts are capped by the platform.</p>
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs font-medium text-white/50 hover:text-white/70">
          Close
        </button>
      </div>
    </div>
  );
}

const CELL =
  "w-20 rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-xs outline-none focus:border-brand-400";
