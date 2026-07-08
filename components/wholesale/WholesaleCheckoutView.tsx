"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

export default function WholesaleCheckoutView({
  hasCredit,
  creditAvailable,
  termsDays,
  defaultName,
}: {
  hasCredit: boolean;
  creditAvailable: number;
  termsDays: number;
  defaultName: string;
}) {
  const router = useRouter();
  const { items, pricedItems, totals, clear, ready } = useCart();
  const [payment, setPayment] = useState<"cod" | "credit">("cod");
  const [poNumber, setPoNumber] = useState("");
  const [addr, setAddr] = useState({
    fullName: defaultName,
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof addr>(k: K, v: string) {
    setAddr((a) => ({ ...a, [k]: v }));
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPlacing(true);
    try {
      const res = await fetch("/api/wholesale/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          address: addr,
          paymentMethod: payment,
          poNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not place order.");
      clear();
      router.push(`/order/${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
      setPlacing(false);
    }
  }

  if (ready && items.length === 0) {
    return <p className="text-sm text-white/50">Your bulk cart is empty.</p>;
  }

  return (
    <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <legend className="px-2 text-sm font-semibold text-white/70">Shipping address</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={addr.fullName} onChange={(v) => set("fullName", v)} required />
            <Input label="Phone" value={addr.phone} onChange={(v) => set("phone", v)} required />
            <Input label="Address line 1" value={addr.line1} onChange={(v) => set("line1", v)} required />
            <Input label="Address line 2" value={addr.line2} onChange={(v) => set("line2", v)} />
            <Input label="City" value={addr.city} onChange={(v) => set("city", v)} required />
            <Input label="State" value={addr.state} onChange={(v) => set("state", v)} required />
            <Input label="Pincode" value={addr.pincode} onChange={(v) => set("pincode", v)} required />
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <legend className="px-2 text-sm font-semibold text-white/70">Payment</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={payment === "cod"} onChange={() => setPayment("cod")} className="accent-brand-600" />
            Cash on delivery
          </label>
          <label className={`mt-2 flex items-center gap-2 text-sm ${hasCredit ? "" : "opacity-50"}`}>
            <input type="radio" disabled={!hasCredit} checked={payment === "credit"} onChange={() => setPayment("credit")} className="accent-brand-600" />
            Net-{termsDays} credit
            {hasCredit ? (
              <span className="text-xs text-white/40">({formatINR(creditAvailable)} available)</span>
            ) : (
              <span className="text-xs text-white/40">(no approved credit line)</span>
            )}
          </label>
          {payment === "credit" && (
            <div className="mt-3">
              <Input label="PO number (optional)" value={poNumber} onChange={setPoNumber} />
            </div>
          )}
        </fieldset>
      </div>

      <aside className="h-fit rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Summary</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {pricedItems.map((it) => (
            <li key={it.slug} className="flex justify-between text-white/70">
              <span className="truncate pr-2">{it.name} × {it.qty}</span>
              <span>{formatINR(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-2 text-sm">
          <span className="font-semibold text-white">Estimated total</span>
          <span className="font-bold text-white">{formatINR(totals.grandTotal)}</span>
        </div>
        <p className="mt-1 text-[11px] text-white/40">Recomputed & charged server-side.</p>
        <button
          type="submit"
          disabled={placing}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {placing ? "Placing…" : "Place wholesale order"}
        </button>
      </aside>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-white/70">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white/[0.02] focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
