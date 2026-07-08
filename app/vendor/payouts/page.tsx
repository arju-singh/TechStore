import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getVendorPayoutSummary, listPayouts, resolveCommissionRate } from "@/lib/payouts";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Payouts" };

export default async function VendorPayoutsPage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");

  const [summary, payouts] = await Promise.all([
    getVendorPayoutSummary(ctx.vendor.slug),
    listPayouts(ctx.vendor.slug),
  ]);
  const rate = resolveCommissionRate(ctx.vendor);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Payouts</h1>
        <p className="mt-1 text-sm text-white/50">
          Your earnings after the {rate}% marketplace commission. Payouts are
          issued by the marketplace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross sales" value={formatINR(summary.gross)} sub={`${summary.ordersCount} orders`} />
        <Stat label="Commission" value={formatINR(summary.commission)} sub={`${rate}%`} />
        <Stat label="Net earned" value={formatINR(summary.net)} />
        <Stat label="Payable now" value={formatINR(summary.payable)} sub={`${formatINR(summary.paidOut)} paid`} />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Payout history ({payouts.length})</h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">
            No payouts yet. Your balance is settled by the marketplace admin.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  {(p.paidAt || p.createdAt).slice(0, 10)}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-medium text-white/80">{formatINR(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}
