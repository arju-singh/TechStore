"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FulfillmentStatus } from "@/lib/orders";

const STATUSES: FulfillmentStatus[] = ["pending", "shipped", "delivered"];

/**
 * Advance the fulfillment status of a vendor's lines in one order. Posts to the
 * vendor orders API, which only ever touches this vendor's items.
 */
export default function VendorOrderStatusControl({
  orderId,
  fulfillment,
}: {
  orderId: string;
  fulfillment: FulfillmentStatus | "mixed";
}) {
  const router = useRouter();
  const [value, setValue] = useState<FulfillmentStatus | "mixed">(fulfillment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as FulfillmentStatus;
    const prev = value;
    setValue(next);
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillmentStatus: next }),
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

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={value}
        onChange={onChange}
        disabled={busy}
        className={`rounded-md border bg-white/5 px-2 py-1 text-xs font-medium capitalize text-white outline-none focus:ring-2 focus:ring-brand-100 ${
          error ? "border-red-400" : "border-white/15"
        }`}
      >
        {value === "mixed" && (
          <option value="mixed" disabled>
            mixed
          </option>
        )}
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">failed</span>}
    </span>
  );
}
