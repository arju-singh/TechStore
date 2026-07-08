import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import ReorderButton from "@/components/wholesale/ReorderButton";

export const metadata: Metadata = { title: "Orders" };

export default async function WholesaleOrdersPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const orders = (await getOrdersByUser(ctx.user.id)).filter(
    (o) => o.orderType === "wholesale"
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesale orders</h1>
        <p className="mt-1 text-sm text-white/50">{orders.length} orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No wholesale orders yet.{" "}
          <Link href="/wholesale/catalog" className="font-medium text-brand-600 hover:underline">
            Browse the catalog →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/order/${o.id}`} className="font-medium text-brand-700 hover:underline">
                      #{o.id.slice(-6)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{o.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 capitalize text-white/70">{o.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-medium text-white/80">{formatINR(o.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/order/${o.id}/invoice`} className="text-xs font-medium text-brand-600 hover:underline">
                        Tax invoice
                      </Link>
                      <ReorderButton lines={o.items.map((it) => ({ slug: it.slug, qty: it.qty }))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
