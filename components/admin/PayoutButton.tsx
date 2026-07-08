"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Settle a vendor's outstanding balance. Posts the payable amount; the server
 * re-caps it at the true balance so this can never over-disburse.
 */
export default function PayoutButton({
  vendorSlug,
  payable,
  label,
}: {
  vendorSlug: string;
  payable: number;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorSlug, amount: payable }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not record payout.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payout.");
    } finally {
      setBusy(false);
    }
  }

  if (payable <= 0) {
    return <span className="text-xs text-white/40">Settled</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={pay}
        disabled={busy}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Recording…" : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
