"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WholesaleStatus } from "@/lib/types";

/** Approve / reject a single wholesale applicant, with optimistic revert on error. */
export default function WholesaleControl({
  userId,
  status,
}: {
  userId: string;
  status: WholesaleStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<WholesaleStatus>(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function update(next: WholesaleStatus) {
    const prev = value;
    setValue(next);
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/wholesale/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setValue(prev);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (value === "approved") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          Approved
        </span>
        <button
          onClick={() => update("rejected")}
          disabled={busy}
          className="text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => update("approved")}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => update("rejected")}
        disabled={busy}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 ${
          value === "rejected" ? "border-red-300 text-red-600" : "border-slate-200 text-slate-600"
        }`}
      >
        {value === "rejected" ? "Rejected" : "Reject"}
      </button>
      {error && <span className="text-xs text-red-500">failed</span>}
    </div>
  );
}
