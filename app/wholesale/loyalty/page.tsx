import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { getLoyaltyLedger } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Rewards" };

export default async function WholesaleLoyaltyPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const ledger = await getLoyaltyLedger(ctx.profile.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reward points</h1>
        <p className="mt-1 text-sm text-white/50">
          Earn 1 point per ₹100 spent on wholesale orders.
        </p>
      </div>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-700 to-slate-900 p-6 text-white">
        <div className="text-sm text-white/70">Points balance</div>
        <div className="mt-1 text-4xl font-bold">{ctx.profile.loyaltyPoints}</div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">History</h2>
        {ledger.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No points earned yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {ledger.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  {t.createdAt.slice(0, 10)} · {t.reason}
                </span>
                <span className={t.delta >= 0 ? "font-medium text-emerald-700" : "font-medium text-red-600"}>
                  {t.delta >= 0 ? "+" : ""}
                  {t.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
