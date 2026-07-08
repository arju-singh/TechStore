import Link from "next/link";
import { getProducts } from "@/lib/products";
import { getAllOrders } from "@/lib/orders";
import { formatINR } from "@/lib/format";

export default async function AdminDashboard() {
  const [products, orders] = await Promise.all([getProducts(), getAllOrders()]);

  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed" || o.status === "paid"
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-white/50">Overview of your store.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={String(products.length)} href="/admin/products" />
        <Stat label="Orders" value={String(orders.length)} href="/admin/orders" />
        <Stat label="Revenue" value={formatINR(revenue)} sub="excl. cancelled" />
        <Stat label="To fulfill" value={String(pendingOrders)} sub="open orders" href="/admin/orders" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Inventory alerts</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            <li className="flex justify-between">
              <span>Low stock (≤ 10)</span>
              <span className="font-semibold text-amber-600">{lowStock}</span>
            </li>
            <li className="flex justify-between">
              <span>Out of stock</span>
              <span className="font-semibold text-red-600">{outOfStock}</span>
            </li>
          </ul>
          <Link
            href="/admin/products"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Manage products →
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/products/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Add product
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              View orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-300">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
