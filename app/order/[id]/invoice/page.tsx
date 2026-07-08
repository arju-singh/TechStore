import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { getWholesalerByUser } from "@/lib/wholesalers";
import { hasDatabase } from "@/lib/mongodb";
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

  // Business identity for the bill-to block comes from the wholesaler profile
  // (a distinct role), when the buyer has one.
  const buyer = hasDatabase
    ? await getWholesalerByUser(order.user).catch(() => null)
    : null;

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

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              Tax Invoice
              {order.orderType === "wholesale" && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  B2B Wholesale
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Invoice #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm text-white/50">Date: {formatDate(order.createdAt)}</p>
            {order.poNumber && (
              <p className="text-sm text-white/50">PO: {order.poNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-white">{SELLER.name}</p>
            <p className="max-w-[16rem] text-xs text-white/50">{SELLER.address}</p>
            <p className="mt-1 text-xs text-white/50">GSTIN: {SELLER.gstin}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid gap-4 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Bill to
            </h2>
            <p className="mt-1 font-medium text-white/80">{order.address.fullName}</p>
            {buyer?.businessName && <p className="text-sm text-white/70">{buyer.businessName}</p>}
            {buyer?.taxNumber && <p className="text-sm text-white/70">GSTIN: {buyer.taxNumber}</p>}
            <p className="text-sm text-white/70">{order.address.line1}</p>
            {order.address.line2 && (
              <p className="text-sm text-white/70">{order.address.line2}</p>
            )}
            <p className="text-sm text-white/70">
              {order.address.city}, {order.address.state} {order.address.pincode}
            </p>
            <p className="text-sm text-white/70">Phone: {order.address.phone}</p>
          </div>
          <div className="sm:text-right">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Payment
            </h2>
            <p className="mt-1 text-sm capitalize text-white/70">{order.paymentMethod}</p>
            {order.creditDueDate && (
              <p className="text-sm text-teal-700">Due: {order.creditDueDate}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="py-2 pr-2 font-semibold">Item</th>
                <th className="py-2 px-2 text-right font-semibold">Qty</th>
                <th className="py-2 px-2 text-right font-semibold">Taxable</th>
                <th className="py-2 px-2 text-right font-semibold">GST%</th>
                <th className="py-2 px-2 text-right font-semibold">GST</th>
                <th className="py-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {lines.map((l) => (
                <tr key={l.slug}>
                  <td className="py-2 pr-2 text-white/70">{l.name}</td>
                  <td className="py-2 px-2 text-right text-white/70">{l.qty}</td>
                  <td className="py-2 px-2 text-right text-white/70">{formatINR(l.taxable)}</td>
                  <td className="py-2 px-2 text-right text-white/70">{l.rate}%</td>
                  <td className="py-2 px-2 text-right text-white/70">{formatINR(l.tax)}</td>
                  <td className="py-2 pl-2 text-right font-medium text-white/80">
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
            <div className="flex justify-between border-t border-white/10 pt-2">
              <dt className="font-semibold text-white">Grand total</dt>
              <dd className="font-bold text-white">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          This is a computer-generated invoice. Prices are inclusive of GST.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className="font-medium text-white/80">{value}</dd>
    </div>
  );
}
