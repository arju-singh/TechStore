"use client";

import { useState } from "react";

export default function RfqRequestButton({
  productSlug,
  defaultQty,
}: {
  productSlug: string;
  defaultQty: number;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(defaultQty));
  const [proposedPrice, setProposedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wholesale/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          requestedQty: Number(qty),
          proposedPrice: Number(proposedPrice) || 0,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send request.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="mt-1 text-[11px] text-emerald-700">Quote requested ✓</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-1 text-[11px] font-medium text-brand-600 hover:underline">
        Request a quote for a larger order →
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
      {error && <div className="text-[11px] text-red-600">{error}</div>}
      <div className="flex gap-1.5">
        <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" placeholder="Qty" className={CELL} />
        <input value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} type="number" placeholder="₹/unit (optional)" className={CELL} />
      </div>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={`${CELL} w-full`} />
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={busy || !qty} className="rounded bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send RFQ"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[11px] text-white/50">Cancel</button>
      </div>
    </div>
  );
}

const CELL = "min-w-0 flex-1 rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[11px]";
