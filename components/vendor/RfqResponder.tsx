"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RfqResponder({
  rfqId,
  proposedPrice,
}: {
  rfqId: string;
  proposedPrice: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "counter">("idle");
  const [counterPrice, setCounterPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "accept" | "reject" | "counter") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/rfq/${rfqId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          counterPrice: action === "counter" ? Number(counterPrice) : undefined,
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send response.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send response.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "counter") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={counterPrice}
          onChange={(e) => setCounterPrice(e.target.value)}
          placeholder="₹/unit"
          className="w-24 rounded border border-white/10 px-2 py-1 text-xs"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-40 rounded border border-white/10 px-2 py-1 text-xs"
        />
        <button onClick={() => send("counter")} disabled={busy || !counterPrice} className="rounded bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
          Send counter
        </button>
        <button onClick={() => setMode("idle")} className="text-xs text-white/50">Cancel</button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {proposedPrice > 0 && (
        <button onClick={() => send("accept")} disabled={busy} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          Accept ₹{proposedPrice}
        </button>
      )}
      <button onClick={() => setMode("counter")} disabled={busy} className="rounded border border-brand-300 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
        Counter
      </button>
      <button onClick={() => send("reject")} disabled={busy} className="rounded border border-white/10 px-2.5 py-1 text-xs font-medium text-white/70 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
        Reject
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
