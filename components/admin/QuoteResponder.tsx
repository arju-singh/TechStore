"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR } from "@/lib/format";

/**
 * Admin control to price a quote request. Shown for quote_requested / quoted
 * orders; sends the quoted total + note and flips the order to "quoted".
 */
export default function QuoteResponder({
  orderId,
  requestedTotal,
  quotedTotal,
  quoteNote,
}: {
  orderId: string;
  requestedTotal: number;
  quotedTotal: number;
  quoteNote: string;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(
    quotedTotal > 0 ? String(quotedTotal) : String(requestedTotal)
  );
  const [note, setNote] = useState(quoteNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotedTotal: Number(total), quoteNote: note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Could not send quote.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 p-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-700">
        {quotedTotal > 0 ? "Update quote" : "Send quote"}
      </p>
      <p className="mb-1.5 text-[11px] text-white/50">
        Requested at {formatINR(requestedTotal)}
      </p>
      <input
        value={total}
        onChange={(e) => setTotal(e.target.value)}
        type="number"
        placeholder="Quoted total ₹"
        className="mb-1.5 w-full rounded border border-white/10 px-2 py-1 text-sm outline-none focus:border-fuchsia-400"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mb-1.5 w-full rounded border border-white/10 px-2 py-1 text-xs outline-none focus:border-fuchsia-400"
      />
      <button
        onClick={send}
        disabled={busy}
        className="w-full rounded bg-fuchsia-700 px-2 py-1 text-xs font-semibold text-white hover:bg-fuchsia-800 disabled:opacity-60"
      >
        {busy ? "Sending…" : quotedTotal > 0 ? "Update quote" : "Send quote"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
