import Link from "next/link";
import type { Metadata } from "next";
import { payoutSummaryForAllVendors, listPayouts } from "@/lib/payouts";
import { formatINR } from "@/lib/format";
import PayoutButton from "@/components/admin/PayoutButton";

export const metadata: Metadata = { title: "Payouts" };

export default async function AdminPayoutsPage() {
  const [summaries, payouts] = await Promise.all([
    payoutSummaryForAllVendors(),
    listPayouts(),
  ]);

  // Vendors with any activity first, then by outstanding balance.
  const rows = [...summaries].sort(
    (a, b) => b.payable - a.payable || b.gross - a.gross
  );

  const totalPayable = rows.reduce((s, r) => s + r.payable, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paidOut, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payouts</h1>
        <p className="mt-1 text-sm text-white/50">
          What each vendor has earned, net of commission, and what's still owed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Outstanding payable" value={formatINR(totalPayable)} />
        <Stat label="Commission earned" value={formatINR(totalCommission)} />
        <Stat label="Paid out to date" value={formatINR(totalPaid)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold">Gross</th>
                <th className="px-4 py-3 font-semibold">Commission</th>
                <th className="px-4 py-3 font-semibold">Net</th>
                <th className="px-4 py-3 font-semibold">Paid out</th>
                <th className="px-4 py-3 font-semibold">Payable</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.vendor.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/stores/${r.vendor.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {r.vendor.name}
                    </Link>
                    <div className="text-xs text-white/40">
                      {r.effectiveCommissionRate}% commission · {r.ordersCount} orders
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatINR(r.gross)}</td>
                  <td className="px-4 py-3 text-white/70">{formatINR(r.commission)}</td>
                  <td className="px-4 py-3 text-white/70">{formatINR(r.net)}</td>
                  <td className="px-4 py-3 text-white/50">{formatINR(r.paidOut)}</td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {formatINR(r.payable)}
                  </td>
                  <td className="px-4 py-3">
                    <PayoutButton
                      vendorSlug={r.vendor.slug}
                      payable={r.payable}
                      label={`Pay ${formatINR(r.payable)}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursement history */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">
          Payout history ({payouts.length})
        </h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No payouts recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  {(p.paidAt || p.createdAt).slice(0, 10)} · {p.vendorName}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
