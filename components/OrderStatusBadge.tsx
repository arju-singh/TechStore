import type { OrderStatus } from "@/lib/orders";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-50 text-blue-700",
  paid: "bg-indigo-50 text-indigo-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  quote_requested: "bg-purple-50 text-purple-700",
  quoted: "bg-fuchsia-50 text-fuchsia-700",
  credit_invoiced: "bg-teal-50 text-teal-700",
};

const LABELS: Record<OrderStatus, string> = {
  pending: "pending",
  confirmed: "confirmed",
  paid: "paid",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  quote_requested: "quote requested",
  quoted: "quote ready",
  credit_invoiced: "credit · invoiced",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status]}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
