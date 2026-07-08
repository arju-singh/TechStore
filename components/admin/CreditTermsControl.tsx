"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreditTermsControl({
  wholesalerId,
  creditLimit,
  termsDays,
  currentBalance,
}: {
  wholesalerId: string;
  creditLimit: number;
  termsDays: number;
  currentBalance: number;
}) {
  const router = useRouter();
  const [limit, setLimit] = useState(String(creditLimit));
  const [days, setDays] = useState(String(termsDays));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/wholesalers/${wholesalerId}/credit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit: Number(limit), termsDays: Number(days) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-white/70">Credit limit (₹)</span>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className={INPUT} />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Net terms (days)</span>
          <input type="number" value={days} onChange={(e) => setDays(e.target.value)} className={INPUT} />
        </label>
      </div>
      <p className="text-xs text-white/40">Outstanding balance: ₹{currentBalance}</p>
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save credit line"}
        </button>
        {msg && <span className="text-xs text-white/50">{msg}</span>}
      </div>
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02]";
