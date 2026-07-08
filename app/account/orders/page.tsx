import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export const metadata: Metadata = { title: "Your orders" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/orders");

  const orders = await getOrdersByUser(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your orders</h1>
        <Link href="/account" className="text-sm font-medium text-brand-600 hover:underline">
          ← Account
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-slate-700">No orders yet</p>
          <p className="mt-1 text-sm text-slate-500">
            When you place an order, it'll show up here.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/order/${order.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        Order #{order.id.slice(-8)}
                      </span>
                      <p className="text-xs text-slate-500">
                        {formatDate(order.createdAt)} · {itemCount}{" "}
                        {itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="line-clamp-1 text-sm text-slate-500">
                      {order.items.map((i) => i.name).join(", ")}
                    </p>
                    <span className="ml-3 whitespace-nowrap text-sm font-bold text-slate-900">
                      {formatINR(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
