"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

interface AvailableCoupon {
  code: string;
  description: string;
}

export default function CouponInput() {
  const { couponCode, couponError, applyCoupon, removeCoupon, totals } = useCart();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<AvailableCoupon[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((d) => setAvailable(d.coupons ?? []))
      .catch(() => {});
  }, []);

  async function onApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const ok = await applyCoupon(code);
    setBusy(false);
    if (ok) setCode("");
  }

  // Applied state
  if (couponCode && totals.couponDiscount > 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-green-800">🏷️ {couponCode}</span>
            <span className="ml-2 text-green-700">
              −{formatINR(totals.couponDiscount)} applied
            </span>
          </div>
          <button
            onClick={removeCoupon}
            className="text-xs font-medium text-green-700 hover:text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={onApply} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Coupon code"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
        >
          {busy ? "…" : "Apply"}
        </button>
      </form>

      {couponError && (
        <p className="mt-2 text-xs text-red-600">{couponError}</p>
      )}

      {available.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          {(showAll ? available : available.slice(0, 2)).map((c) => (
            <button
              key={c.code}
              onClick={() => setCode(c.code)}
              className="mr-2 mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
              title={c.description}
            >
              {c.code}
            </button>
          ))}
          {!showAll && available.length > 2 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-brand-600 hover:underline"
            >
              +{available.length - 2} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
