import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorById } from "@/lib/vendors";
import { getProductsByVendor } from "@/lib/products";
import { getOrdersForVendor } from "@/lib/orders";
import { getVendorPayoutSummary, platformCommissionRate } from "@/lib/payouts";
import { formatINR } from "@/lib/format";
import VendorStatusControl from "@/components/admin/VendorStatusControl";
import CommissionRateInput from "@/components/admin/CommissionRateInput";

export const metadata: Metadata = { title: "Store detail" };

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await getVendorById(id);
  if (!vendor) notFound();

  const [products, orders, earnings] = await Promise.all([
    getProductsByVendor(vendor.slug),
    getOrdersForVendor(vendor.slug),
    getVendorPayoutSummary(vendor.slug),
  ]);
  const platformDefault = platformCommissionRate();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/stores" className="text-sm font-medium text-brand-600 hover:underline">
          ← Stores
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
            <p className="text-sm text-white/50">
              /{vendor.slug} ·{" "}
              <span className="capitalize">{vendor.status}</span>
            </p>
          </div>
          <VendorStatusControl vendorId={vendor.id} status={vendor.status} />
        </div>
      </div>

      {/* Earnings snapshot */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Gross sales" value={formatINR(earnings.gross)} sub={`${earnings.ordersCount} orders`} />
        <Stat label="Commission" value={formatINR(earnings.commission)} sub="platform take" />
        <Stat label="Net earned" value={formatINR(earnings.net)} />
        <Stat label="Payable now" value={formatINR(earnings.payable)} sub={`${formatINR(earnings.paidOut)} paid out`} />
      </div>

      {/* Profile + commission */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Owner user ID" value={vendor.ownerUserId || "—"} />
            <Row label="Email" value={vendor.email || "—"} />
            <Row label="Phone" value={vendor.phone || "—"} />
            <Row label="GSTIN" value={vendor.gstin || "—"} />
            <Row
              label="Pickup"
              value={
                [vendor.address.line1, vendor.address.city, vendor.address.state, vendor.address.pincode]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          </dl>
          {vendor.description && (
            <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
              {vendor.description}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Commission</h2>
          <p className="mt-1 text-sm text-white/50">
            The platform's cut of this store's gross sales.
          </p>
          <div className="mt-3">
            <CommissionRateInput
              vendorId={vendor.id}
              commissionRate={vendor.commissionRate}
              platformDefault={platformDefault}
            />
          </div>
        </div>
      </div>

      {/* Catalog */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">
          Catalog ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No products listed yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {products.map((p) => (
              <li key={p.slug} className="flex items-center justify-between py-2">
                <Link href={`/product/${p.slug}`} className="text-white/70 hover:text-brand-700">
                  {p.name}
                </Link>
                <span className="text-white/50">
                  {formatINR(p.price)} · {p.stock} in stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">
          Recent orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {orders.slice(0, 10).map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  {o.createdAt.slice(0, 10)} · {o.items.length} item
                  {o.items.length === 1 ? "" : "s"}
                </span>
                <span className="text-white/70">{formatINR(o.vendorSubtotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-right text-white/70">{value}</dd>
    </div>
  );
}
