"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Set (or clear) a vendor's commission-rate override. A blank field means "use
 * the platform default" — the override is cleared to null on the server.
 */
export default function CommissionRateInput({
  vendorId,
  commissionRate,
  platformDefault,
}: {
  vendorId: string;
  commissionRate: number | null;
  platformDefault: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(
    commissionRate === null ? "" : String(commissionRate)
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionRate: value.trim() === "" ? null : Number(value),
        }),
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(platformDefault)}
          min={0}
          max={100}
          step="any"
          className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-7 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
          %
        </span>
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <span className="text-xs text-white/40">
        blank = platform default ({platformDefault}%)
      </span>
      {msg && <span className="text-xs text-white/50">{msg}</span>}
    </div>
  );
}
