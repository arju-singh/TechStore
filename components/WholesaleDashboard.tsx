"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authClient";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";
import type { Order } from "@/lib/orders";

const BENEFITS = [
  { title: "Wholesale pricing", body: "Contract rates below every public price on eligible products." },
  { title: "Net-30 credit", body: "Pay within 30 days against an invoice at checkout." },
  { title: "Request a quote", body: "Ask for custom pricing on large carts from checkout." },
];

export default function WholesaleDashboard() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => active && setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch(() => active && setOrders([]));
    return () => {
      active = false;
    };
  }, []);

  async function reorder(order: Order) {
    setReordering(order.id);
    try {
      // Fetch fresh product data per line so cart pricing/stock is current.
      const results = await Promise.all(
        order.items.map(async (it) => {
          const res = await fetch(`/api/products/${it.slug}`);
          if (!res.ok) return null;
          const { product } = await res.json();
          return { product, qty: it.qty };
        })
      );
      for (const r of results) {
        if (r?.product) addItem(r.product, r.qty);
      }
      router.push("/cart");
    } finally {
      setReordering(null);
    }
  }

  const recent = (orders ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
          APPROVED WHOLESALER
        </span>
        <h2 className="mt-3 text-xl font-bold text-slate-900">
          {user?.companyName || user?.name}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your account has wholesale pricing unlocked across eligible products.
        </p>
        <Link
          href="/products?bulk=1"
          className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Shop bulk deals →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{b.title}</p>
            <p className="mt-1 text-xs text-slate-500">{b.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent orders</h3>
          <Link href="/account/orders" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {orders === null ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((o) => {
              const count = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/order/${o.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-700">
                      #{o.id.slice(-8)}
                    </Link>
                    <p className="truncate text-xs text-slate-400">
                      {count} {count === 1 ? "item" : "items"} · {formatINR(o.total)} · {o.status.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => reorder(o)}
                    disabled={reordering === o.id}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {reordering === o.id ? "Adding…" : "Reorder"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
