"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

interface Calc {
  totals: { subtotal: number; deliveryFee: number; grandTotal: number; savings: number };
}

export default function WholesaleCartView() {
  const { items, pricedItems, updateQty, removeItem, ready } = useCart();
  const [calc, setCalc] = useState<Calc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Server-authoritative price check whenever the cart changes.
  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      setCalc(null);
      setError(null);
      return;
    }
    let active = true;
    setChecking(true);
    fetch("/api/wholesale/cart/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ slug: i.slug, qty: i.qty })) }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!active) return;
        if (ok) {
          setCalc(d);
          setError(null);
        } else {
          setCalc(null);
          setError(d?.error || "Could not price the cart.");
        }
      })
      .catch(() => active && setError("Could not reach the pricing service."))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [items, ready]);

  if (!ready) return <p className="text-sm text-white/50">Loading…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
        <p className="text-sm text-white/50">Your bulk cart is empty.</p>
        <Link href="/wholesale/catalog" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Browse the wholesale catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        {pricedItems.map((it) => (
          <div key={it.slug} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white/80">{it.name}</div>
              <div className="text-xs text-white/40">{formatINR(it.unitPrice)}/unit</div>
              {it.moqError && <div className="text-xs text-amber-600">{it.moqError}</div>}
            </div>
            <input
              type="number"
              value={it.qty}
              min={1}
              onChange={(e) => updateQty(it.slug, Number(e.target.value) || 1)}
              className="w-20 rounded border border-white/10 px-2 py-1 text-sm"
            />
            <div className="w-24 text-right text-sm font-semibold text-white">
              {formatINR(it.lineTotal)}
            </div>
            <button onClick={() => removeItem(it.slug)} className="text-white/40 hover:text-red-600" title="Remove">×</button>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Order summary</h2>
        {error ? (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>
        ) : (
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatINR(calc?.totals.subtotal ?? 0)} />
            <Row label="You save" value={formatINR(calc?.totals.savings ?? 0)} />
            <Row label="Delivery" value={calc?.totals.deliveryFee ? formatINR(calc.totals.deliveryFee) : "FREE"} />
            <div className="flex justify-between border-t border-white/10 pt-2">
              <dt className="font-semibold text-white">Total (server-verified)</dt>
              <dd className="font-bold text-white">{formatINR(calc?.totals.grandTotal ?? 0)}</dd>
            </div>
          </dl>
        )}
        <Link
          href="/wholesale/checkout"
          aria-disabled={Boolean(error)}
          className={`mt-4 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white ${
            error ? "pointer-events-none bg-white/10" : "bg-brand-600 hover:bg-brand-700"
          }`}
        >
          {checking ? "Checking…" : "Proceed to checkout"}
        </Link>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Final pricing is recomputed on the server at checkout.
        </p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className="font-medium text-white/80">{value}</dd>
    </div>
  );
}
