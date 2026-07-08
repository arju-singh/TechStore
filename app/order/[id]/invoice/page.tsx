import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { formatINR } from "@/lib/format";
import { gstBreakup } from "@/lib/pricing";
import InvoicePrintButton from "@/components/InvoicePrintButton";

export const metadata: Metadata = { title: "Tax invoice" };

// Seller identity for the invoice header. Configurable via env for a real shop.
const SELLER = {
  name: process.env.SELLER_NAME || "TechStore Retail Pvt Ltd",
  gstin: process.env.SELLER_GSTIN || "29ABCDE1234F1Z5",
  address:
    process.env.SELLER_ADDRESS ||
    "4th Floor, Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(d);
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?redirect=/order/${id}/invoice`);

  const order = await getOrderById(id);
  if (!order || order.user !== user.id) notFound();

  // Per-line GST breakup (prices are GST-inclusive).
  const lines = order.items.map((it) => {
    const rate = it.gstRate ?? 18;
    const lineInclusive = it.price * it.qty;
    const b = gstBreakup(lineInclusive, rate);
    return { ...it, rate, lineInclusive, taxable: b.taxable, tax: b.tax };
  });

  const taxableTotal = lines.reduce((s, l) => s + l.taxable, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const cgst = taxTotal / 2;
  const sgst = taxTotal / 2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/order/${order.id}`} className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to order
        </Link>
        <InvoicePrintButton />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tax Invoice</h1>
            <p className="mt-1 text-sm text-slate-500">
              Invoice #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm text-slate-500">Date: {formatDate(order.createdAt)}</p>
            {order.poNumber && (
              <p className="text-sm text-slate-500">PO: {order.poNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{SELLER.name}</p>
            <p className="max-w-[16rem] text-xs text-slate-500">{SELLER.address}</p>
            <p className="mt-1 text-xs text-slate-500">GSTIN: {SELLER.gstin}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid gap-4 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Bill to
            </h2>
            <p className="mt-1 font-medium text-slate-800">{order.address.fullName}</p>
            {user.companyName && <p className="text-sm text-slate-600">{user.companyName}</p>}
            {user.gstin && <p className="text-sm text-slate-600">GSTIN: {user.gstin}</p>}
            <p className="text-sm text-slate-600">{order.address.line1}</p>
            {order.address.line2 && (
              <p className="text-sm text-slate-600">{order.address.line2}</p>
            )}
            <p className="text-sm text-slate-600">
              {order.address.city}, {order.address.state} {order.address.pincode}
            </p>
            <p className="text-sm text-slate-600">Phone: {order.address.phone}</p>
          </div>
          <div className="sm:text-right">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payment
            </h2>
            <p className="mt-1 text-sm capitalize text-slate-700">{order.paymentMethod}</p>
            {order.creditDueDate && (
              <p className="text-sm text-teal-700">Due: {order.creditDueDate}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 px-2 text-right font-semibold">Qty</th>
                <th className="py-2 px-2 text-right font-semibold">Taxable</th>
                <th className="py-2 px-2 text-right font-semibold">GST%</th>
                <th className="py-2 px-2 text-right font-semibold">GST</th>
                <th className="py-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => (
                <tr key={l.slug}>
                  <td className="py-2 pr-2 text-slate-700">{l.name}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{l.qty}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{formatINR(l.taxable)}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{l.rate}%</td>
                  <td className="py-2 px-2 text-right text-slate-600">{formatINR(l.tax)}</td>
                  <td className="py-2 pl-2 text-right font-medium text-slate-800">
                    {formatINR(l.lineInclusive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Taxable value" value={formatINR(taxableTotal)} />
            <Row label="CGST" value={formatINR(cgst)} />
            <Row label="SGST" value={formatINR(sgst)} />
            {order.couponDiscount > 0 && (
              <Row label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatINR(order.couponDiscount)}`} />
            )}
            <Row
              label="Delivery"
              value={order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}
            />
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-semibold text-slate-900">Grand total</dt>
              <dd className="font-bold text-slate-900">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          This is a computer-generated invoice. Prices are inclusive of GST.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
