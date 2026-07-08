import Link from "next/link";
import type { Metadata } from "next";
import { getAllOrders } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import OrderStatusControl from "@/components/admin/OrderStatusControl";
import QuoteResponder from "@/components/admin/QuoteResponder";

export const metadata: Metadata = { title: "Orders" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-white/50">{orders.length} orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {orders.map((o) => {
                  const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
                  return (
                    <tr key={o.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white/80">#{o.id.slice(-8)}</div>
                        <div className="text-xs text-white/40">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white/70">{o.address.fullName}</div>
                        <div className="text-xs text-white/40">
                          {o.address.city}, {o.address.pincode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 capitalize text-white/70">
                        {o.paymentMethod === "razorpay" ? "Online" : "COD"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white/80">
                        {formatINR(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusControl orderId={o.id} status={o.status} />
                        {(o.status === "quote_requested" || o.status === "quoted") && (
                          <QuoteResponder
                            orderId={o.id}
                            requestedTotal={o.total}
                            quotedTotal={o.quotedTotal}
                            quoteNote={o.quoteNote}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
