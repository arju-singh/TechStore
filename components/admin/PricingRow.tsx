"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/format";

function tiersToText(tiers?: { minQty: number; unitPrice: number }[]): string {
  return (tiers ?? []).map((t) => `${t.minQty}:${t.unitPrice}`).join(", ");
}

/** One product's pricing (GST, volume tiers, wholesale) — inline editable + save. */
export default function PricingRow({ product }: { product: Product }) {
  const [gstRate, setGstRate] = useState((product.gstRate ?? 18).toString());
  const [tiers, setTiers] = useState(tiersToText(product.priceTiers));
  const [wEnabled, setWEnabled] = useState(product.wholesale?.enabled ?? false);
  const [wPrice, setWPrice] = useState((product.wholesale?.unitPrice ?? "").toString());
  const [wMoq, setWMoq] = useState((product.wholesale?.moq ?? "").toString());
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  function applyDefaults() {
    // ~4% / ~8% volume breaks and ~14% wholesale, scaled to the base price.
    const p = product.price;
    const round = (n: number) => Math.round(n);
    setTiers(`5:${round(p * 0.96)}, 10:${round(p * 0.92)}`);
    setWEnabled(true);
    setWPrice(String(round(p * 0.86)));
    setWMoq("10");
  }

  async function save() {
    setState("saving");
    setMsg(null);
    // Parse "minQty:price" pairs (comma or newline separated).
    const priceTiers = tiers
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [q, u] = s.split(":");
        return { minQty: Number(q), unitPrice: Number(u) };
      });
    try {
      const res = await fetch(`/api/admin/products/${product.slug}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstRate: Number(gstRate),
          priceTiers,
          wholesale: { enabled: wEnabled, unitPrice: Number(wPrice), moq: Number(wMoq) },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Could not save.");
    }
  }

  const inputCls =
    "w-full rounded border border-white/10 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100";

  return (
    <tr className="align-top hover:bg-white/5">
      <td className="px-3 py-3">
        <div className="font-medium text-white/80">{product.name}</div>
        <div className="text-xs text-white/40">
          {formatINR(product.price)} · {product.category}
        </div>
      </td>
      <td className="px-3 py-3 w-20">
        <input value={gstRate} onChange={(e) => setGstRate(e.target.value)} type="number" className={inputCls} />
      </td>
      <td className="px-3 py-3 w-52">
        <input
          value={tiers}
          onChange={(e) => setTiers(e.target.value)}
          placeholder="5:11999, 10:11499"
          className={`${inputCls} font-mono`}
        />
      </td>
      <td className="px-3 py-3 w-64">
        <label className="flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={wEnabled} onChange={(e) => setWEnabled(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          Wholesale
        </label>
        {wEnabled && (
          <div className="mt-1.5 flex gap-1.5">
            <input value={wPrice} onChange={(e) => setWPrice(e.target.value)} type="number" placeholder="price" className={inputCls} />
            <input value={wMoq} onChange={(e) => setWMoq(e.target.value)} type="number" placeholder="MOQ" className={inputCls} />
          </div>
        )}
      </td>
      <td className="px-3 py-3 w-32">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1.5">
            <button
              onClick={save}
              disabled={state === "saving"}
              className="rounded bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save"}
            </button>
            <button
              onClick={applyDefaults}
              type="button"
              className="rounded border border-white/10 px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/5"
            >
              Auto
            </button>
          </div>
          {state === "error" && msg && <span className="text-xs text-red-600">{msg}</span>}
        </div>
      </td>
    </tr>
  );
}
