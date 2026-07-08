import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import { gstBreakup } from "@/lib/pricing";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import AcceptQuoteButton from "@/components/AcceptQuoteButton";

export const metadata: Metadata = { title: "Order details" };

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Online (Razorpay)",
  cod: "Cash on Delivery",
  credit: "Credit (Net-30)",
  quote: "Quote request",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?redirect=/order/${id}`);

  const order = await getOrderById(id);
  if (!order || order.user !== user.id) notFound();

  const { placed } = await searchParams;
  const justPlaced = placed === "1";

  // GST is extracted from the (inclusive) taxable portion — the subtotal after
  // coupon, excluding the delivery fee.
  const taxableInclusive = Math.max(0, order.subtotal - order.couponDiscount);
  const orderGstRate = order.items[0]?.gstRate ?? 18;
  const gst = gstBreakup(taxableInclusive, orderGstRate);
  const isQuote = order.paymentMethod === "quote";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2.5}>
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-green-800">
              {isQuote ? "Quote request submitted!" : "Order placed successfully!"}
            </p>
            <p className="text-sm text-green-700">
              {isQuote
                ? "Our team will review your request and get back to you with pricing."
                : order.paymentMethod === "razorpay"
                ? "Thanks for your order. Your payment was received."
                : order.paymentMethod === "credit"
                ? "Thanks for your order. It has been invoiced on Net-30 credit terms."
                : "Thanks for your order. You'll pay on delivery."}
            </p>
          </div>
        </div>
      )}

      {/* Quote states */}
      {order.status === "quote_requested" && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          <p className="font-semibold">Quote requested</p>
          <p className="mt-0.5">
            We've received your request and will respond with pricing shortly.
          </p>
        </div>
      )}
      {order.status === "quoted" && (
        <div className="mb-6 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-5">
          <p className="font-semibold text-fuchsia-800">Your quote is ready</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatINR(order.quotedTotal)}
            </span>
            <span className="text-sm text-slate-500 line-through">
              {formatINR(order.total)}
            </span>
          </div>
          {order.quoteNote && (
            <p className="mt-1 text-sm text-slate-600">“{order.quoteNote}”</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Accepting converts this to a Net-30 credit order at the quoted price.
          </p>
          <div className="mt-3">
            <AcceptQuoteButton orderId={order.id} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Order #{order.id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Items */}
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-4 p-4">
              <Link
                href={`/product/${item.slug}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100"
              >
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                )}
              </Link>
              <div className="flex-1">
                <Link
                  href={`/product/${item.slug}`}
                  className="text-sm font-semibold text-slate-800 hover:text-brand-700"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-slate-500">Qty {item.qty}</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {formatINR(item.price * item.qty)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Address */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Delivery address
          </h2>
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-medium">{order.address.fullName}</p>
            <p>{order.address.line1}</p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>
              {order.address.city}, {order.address.state} {order.address.pincode}
            </p>
            <p className="mt-1 text-slate-500">Phone: {order.address.phone}</p>
          </div>
        </section>

        {/* Payment summary */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Method</dt>
              <dd className="font-medium text-slate-800">
                {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </dd>
            </div>
            {order.poNumber && (
              <div className="flex justify-between">
                <dt className="text-slate-500">PO number</dt>
                <dd className="font-medium text-slate-800">{order.poNumber}</dd>
              </div>
            )}
            {order.creditDueDate && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment due</dt>
                <dd className="font-medium text-teal-700">{order.creditDueDate}</dd>
              </div>
            )}
            {order.razorpayPaymentId && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment ID</dt>
                <dd className="font-mono text-xs text-slate-700">
                  {order.razorpayPaymentId}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal (incl. GST)</dt>
              <dd className="font-medium text-slate-800">{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-xs">
              <dt className="text-slate-400">of which GST ({gst.rate}%)</dt>
              <dd className="text-slate-500">{formatINR(gst.tax)}</dd>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  Coupon{order.couponCode ? ` (${order.couponCode})` : ""}
                </dt>
                <dd className="font-medium text-green-600">
                  − {formatINR(order.couponDiscount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-medium text-slate-800">
                {order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/account/orders"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          View all orders
        </Link>
        {!isQuote && (
          <Link
            href={`/order/${order.id}/invoice`}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tax invoice
          </Link>
        )}
        <Link
          href="/products"
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
