"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RfqConvertButton({
  rfqId,
  hasCredit,
  defaultName,
}: {
  rfqId: string;
  hasCredit: boolean;
  defaultName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState<"cod" | "credit">("cod");
  const [addr, setAddr] = useState({
    fullName: defaultName,
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof addr>(k: K, v: string) {
    setAddr((a) => ({ ...a, [k]: v }));
  }

  async function convert() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wholesale/rfq/${rfqId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, paymentMethod: payment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not convert.");
      router.push(`/order/${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not convert.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
        Order at agreed price
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <input value={addr.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Full name" className={CELL} />
        <input value={addr.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" className={CELL} />
        <input value={addr.line1} onChange={(e) => set("line1", e.target.value)} placeholder="Address" className={CELL} />
        <input value={addr.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className={CELL} />
        <input value={addr.state} onChange={(e) => set("state", e.target.value)} placeholder="State" className={CELL} />
        <input value={addr.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="Pincode" className={CELL} />
      </div>
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")} /> COD
        </label>
        <label className={`flex items-center gap-1 ${hasCredit ? "" : "opacity-50"}`}>
          <input type="radio" disabled={!hasCredit} checked={payment === "credit"} onChange={() => setPayment("credit")} /> Credit
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={convert} disabled={busy} className="rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Placing…" : "Place order"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-white/50">Cancel</button>
      </div>
    </div>
  );
}

const CELL = "rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-xs";
