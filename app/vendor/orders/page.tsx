import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getOrdersForVendor } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import VendorOrderStatusControl from "@/components/vendor/VendorOrderStatusControl";

export const metadata: Metadata = { title: "Orders" };

export default async function VendorOrdersPage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");
  const orders = await getOrdersForVendor(ctx.vendor.slug);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-white/50">
          {orders.length} order{orders.length === 1 ? "" : "s"} containing your
          products. Update fulfillment as you ship.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="text-sm font-semibold text-white/80">
                    Order #{o.id.slice(-6)}
                  </div>
                  <div className="text-xs text-white/40">
                    {o.createdAt.slice(0, 10)} · ship to {o.address.city}, {o.address.state}{" "}
                    {o.address.pincode}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">
                    {formatINR(o.vendorSubtotal)}
                  </span>
                  <VendorOrderStatusControl orderId={o.id} fulfillment={o.fulfillment} />
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {o.items.map((it) => (
                  <li key={it.slug} className="flex justify-between text-white/70">
                    <span>
                      {it.name} <span className="text-white/40">× {it.qty}</span>
                    </span>
                    <span>{formatINR(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
