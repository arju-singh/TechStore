"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProductButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Could not delete.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          onClick={doDelete}
          disabled={busy}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 hover:underline"
        title={`Delete ${name}`}
      >
        Delete
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  );
}
