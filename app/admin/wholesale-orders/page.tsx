import Link from "next/link";
import type { Metadata } from "next";
import { getAllOrders } from "@/lib/orders";
import { getAllWholesalers } from "@/lib/wholesalers";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Wholesale orders" };

export default async function AdminWholesaleOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [all, wholesalers] = await Promise.all([getAllOrders(), getAllWholesalers()]);
  const nameByUser = new Map(wholesalers.map((w) => [w.userId, w.businessName]));

  const wholesale = all.filter((o) => o.orderType === "wholesale");
  const retailRevenue = all
    .filter((o) => o.orderType !== "wholesale" && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const wholesaleRevenue = wholesale
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  const rows = status
    ? wholesale.filter((o) => o.status === status)
    : wholesale;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesale orders</h1>
        <p className="mt-1 text-sm text-white/50">
          {wholesale.length} wholesale orders
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Split label="Wholesale revenue" value={formatINR(wholesaleRevenue)} tone="text-blue-700" />
        <Split label="Retail revenue" value={formatINR(retailRevenue)} tone="text-white/80" />
        <Split
          label="Wholesale share"
          value={
            retailRevenue + wholesaleRevenue > 0
              ? `${Math.round((wholesaleRevenue / (retailRevenue + wholesaleRevenue)) * 100)}%`
              : "—"
          }
          tone="text-emerald-700"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No wholesale orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Buyer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/order/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      #{o.id.slice(-6)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{nameByUser.get(o.user) ?? "—"}</td>
                  <td className="px-4 py-3 text-white/70">{o.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 capitalize text-white/70">{o.paymentMethod}</td>
                  <td className="px-4 py-3 capitalize text-white/70">{o.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-medium text-white/80">{formatINR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Split({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
