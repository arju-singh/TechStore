"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Customer accepts an admin's quote → converts to a Net-30 credit order. */
export default function AcceptQuoteButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept-quote`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Could not accept the quote.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the quote.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={accept}
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Accepting…" : "Accept quote (Net-30)"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
