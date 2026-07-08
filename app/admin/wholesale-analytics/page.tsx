import type { Metadata } from "next";
import { getAllOrders } from "@/lib/orders";
import { getAllWholesalers } from "@/lib/wholesalers";
import { formatINR } from "@/lib/format";
import ExportCsvButton from "@/components/admin/ExportCsvButton";

export const metadata: Metadata = { title: "Wholesale analytics" };

export default async function WholesaleAnalyticsPage() {
  const [all, wholesalers] = await Promise.all([getAllOrders(), getAllWholesalers()]);
  const nameByUser = new Map(wholesalers.map((w) => [w.userId, w.businessName]));

  const live = all.filter((o) => o.status !== "cancelled");
  const wholesale = live.filter((o) => o.orderType === "wholesale");
  const retailRevenue = live.filter((o) => o.orderType !== "wholesale").reduce((s, o) => s + o.total, 0);
  const wholesaleRevenue = wholesale.reduce((s, o) => s + o.total, 0);

  // Top buyers by wholesale spend.
  const buyerTotals = new Map<string, number>();
  for (const o of wholesale) buyerTotals.set(o.user, (buyerTotals.get(o.user) ?? 0) + o.total);
  const topBuyers = [...buyerTotals.entries()]
    .map(([user, total]) => ({ name: nameByUser.get(user) ?? user, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top vendors + products by wholesale revenue.
  const vendorTotals = new Map<string, number>();
  const productTotals = new Map<string, { name: string; revenue: number; qty: number }>();
  for (const o of wholesale) {
    for (const it of o.items) {
      const rev = it.price * it.qty;
      const vName = it.vendorName || "TechStore (house)";
      vendorTotals.set(vName, (vendorTotals.get(vName) ?? 0) + rev);
      const p = productTotals.get(it.slug) ?? { name: it.name, revenue: 0, qty: 0 };
      p.revenue += rev;
      p.qty += it.qty;
      productTotals.set(it.slug, p);
    }
  }
  const topVendors = [...vendorTotals.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topProducts = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Monthly wholesale sales.
  const monthly = new Map<string, number>();
  for (const o of wholesale) {
    const m = o.createdAt.slice(0, 7);
    monthly.set(m, (monthly.get(m) ?? 0) + o.total);
  }
  const months = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const total = retailRevenue + wholesaleRevenue;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Wholesale analytics</h1>
        <ExportCsvButton
          filename="wholesale-orders.csv"
          headers={["Order", "Date", "Buyer", "Payment", "Status", "Total"]}
          rows={wholesale.map((o) => [
            o.id.slice(-6),
            o.createdAt.slice(0, 10),
            nameByUser.get(o.user) ?? o.user,
            o.paymentMethod,
            o.status,
            o.total,
          ])}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Wholesale revenue" value={formatINR(wholesaleRevenue)} />
        <Stat label="Retail revenue" value={formatINR(retailRevenue)} />
        <Stat label="B2B share" value={total > 0 ? `${Math.round((wholesaleRevenue / total) * 100)}%` : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard title="Top buyers" rows={topBuyers.map((b) => [b.name, formatINR(b.total)])} />
        <RankCard title="Top vendors (wholesale)" rows={topVendors.map((v) => [v.name, formatINR(v.revenue)])} />
        <RankCard title="Top products (wholesale)" rows={topProducts.map((p) => [`${p.name} · ${p.qty} units`, formatINR(p.revenue)])} />
        <RankCard title="Monthly wholesale sales" rows={months.map(([m, v]) => [m, formatINR(v)])} />
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

function RankCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">No data yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {rows.map(([label, value], i) => (
            <li key={i} className="flex items-center justify-between py-2">
              <span className="truncate pr-2 text-white/70">{label}</span>
              <span className="font-medium text-white/80">{value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
