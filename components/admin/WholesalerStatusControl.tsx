"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = {
  status: string;
  label: string;
  className: string;
  needsReason?: boolean;
};

const ACTIONS: Action[] = [
  { status: "approved", label: "Approve", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { status: "needs_docs", label: "Request docs", className: "border border-amber-300 text-amber-700 hover:bg-amber-50", needsReason: true },
  { status: "rejected", label: "Reject", className: "border border-red-300 text-red-600 hover:bg-red-50", needsReason: true },
  { status: "suspended", label: "Suspend", className: "border border-orange-300 text-orange-700 hover:bg-orange-50" },
  { status: "blacklisted", label: "Blacklist", className: "border border-white/15 text-white/70 hover:bg-white/10" },
];

/** Admin decision buttons for a wholesaler, with a reason prompt where required. */
export default function WholesalerStatusControl({
  wholesalerId,
  status,
}: {
  wholesalerId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<Action | null>(null);
  const [reason, setReason] = useState("");

  async function apply(next: string, why = "") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/wholesalers/${wholesalerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, reason: why }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not update.");
      setReasonFor(null);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  if (reasonFor) {
    return (
      <div className="space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={`Reason for "${reasonFor.label}" (sent to the applicant)…`}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02]"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => apply(reasonFor.status, reason)}
            disabled={busy || reason.trim().length < 3}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
          <button
            onClick={() => { setReasonFor(null); setReason(""); }}
            className="text-xs font-medium text-white/50 hover:text-white/70"
          >
            Cancel
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.filter((a) => a.status !== status).map((a) => (
        <button
          key={a.status}
          onClick={() => (a.needsReason ? setReasonFor(a) : apply(a.status))}
          disabled={busy}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${a.className}`}
        >
          {a.label}
        </button>
      ))}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
