"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VendorStatus } from "@/lib/types";

/**
 * Move a vendor through its lifecycle (approve / suspend / reject / reactivate),
 * with optimistic update and revert on error. Mirrors WholesaleControl.
 */
export default function VendorStatusControl({
  vendorId,
  status,
}: {
  vendorId: string;
  status: VendorStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<VendorStatus>(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function update(next: VendorStatus) {
    const prev = value;
    setValue(next);
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
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

  const approveBtn = (
    <button
      onClick={() => update("approved")}
      disabled={busy}
      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {value === "suspended" ? "Reactivate" : "Approve"}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value !== "approved" && approveBtn}
      {value === "approved" && (
        <button
          onClick={() => update("suspended")}
          disabled={busy}
          className="rounded-md border border-amber-300 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {value !== "rejected" && (
        <button
          onClick={() => update("rejected")}
          disabled={busy}
          className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-white/70 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          Reject
        </button>
      )}
      {error && <span className="text-xs text-red-500">failed</span>}
    </div>
  );
}
