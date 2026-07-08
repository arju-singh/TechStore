"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEMBERSHIP_PLANS } from "@/lib/membership";
import { formatINR } from "@/lib/format";

export default function MembershipPlans({ currentTier }: { currentTier: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(tier: string) {
    setBusy(tier);
    setError(null);
    try {
      const res = await fetch("/api/wholesale/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not update membership.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update membership.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MEMBERSHIP_PLANS.map((plan) => {
          const active = currentTier === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`flex flex-col rounded-2xl border p-5 ${
                active ? "border-brand-500 ring-2 ring-brand-100" : "border-white/10"
              }`}
            >
              <h3 className="text-lg font-bold text-white">{plan.label}</h3>
              <p className="mt-1 text-2xl font-bold text-white">
                {formatINR(plan.pricePerMonth)}
                <span className="text-sm font-normal text-white/40">/mo</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-white/70">
                {plan.benefits.map((b) => (
                  <li key={b}>✔ {b}</li>
                ))}
              </ul>
              <button
                onClick={() => choose(active ? "none" : plan.tier)}
                disabled={busy !== null}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                  active
                    ? "border border-white/10 text-white/70 hover:bg-white/5"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {busy === plan.tier ? "…" : active ? "Cancel membership" : `Get ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-white/40">
        Demo: choosing a plan records the membership and applies its perks
        immediately. Recurring billing is not integrated.
      </p>
    </div>
  );
}
