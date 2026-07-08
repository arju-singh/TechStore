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
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">{orders.length} orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No orders yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">#{o.id.slice(-8)}</div>
                        <div className="text-xs text-slate-400">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{o.address.fullName}</div>
                        <div className="text-xs text-slate-400">
                          {o.address.city}, {o.address.pincode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {o.paymentMethod === "razorpay" ? "Online" : "COD"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
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
