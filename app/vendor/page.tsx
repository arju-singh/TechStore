import Link from "next/link";
import { redirect } from "next/navigation";
import { getVendorContext } from "@/lib/auth";
import { getProductsByVendor } from "@/lib/products";
import { getOrdersForVendor } from "@/lib/orders";
import { getVendorPayoutSummary } from "@/lib/payouts";
import { formatINR } from "@/lib/format";

export default async function VendorDashboardPage() {
  const { user, vendor } = await getVendorContext();
  if (!user) redirect("/login?next=/vendor");
  if (!vendor) redirect("/vendor/apply");

  // Non-approved states get a status notice instead of the dashboard.
  if (vendor.status !== "approved") {
    return <StatusNotice status={vendor.status} name={vendor.name} />;
  }

  const [products, orders, earnings] = await Promise.all([
    getProductsByVendor(vendor.slug),
    getOrdersForVendor(vendor.slug),
    getVendorPayoutSummary(vendor.slug),
  ]);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const toFulfill = orders.filter((o) => o.fulfillment !== "delivered").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
      <p className="mt-1 text-sm text-white/50">
        Your seller dashboard ·{" "}
        <Link href={`/store/${vendor.slug}`} className="text-brand-600 hover:underline">
          view your storefront →
        </Link>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={String(products.length)} href="/vendor/products" />
        <Stat label="Orders" value={String(orders.length)} sub={`${toFulfill} to fulfill`} href="/vendor/orders" />
        <Stat label="Net earned" value={formatINR(earnings.net)} sub={`after commission`} />
        <Stat label="Payable" value={formatINR(earnings.payable)} sub="from the marketplace" href="/vendor/payouts" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Inventory alerts</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            <li className="flex justify-between">
              <span>Low stock (≤ 10)</span>
              <span className="font-semibold text-amber-600">{lowStock}</span>
            </li>
            <li className="flex justify-between">
              <span>Out of stock</span>
              <span className="font-semibold text-red-600">{outOfStock}</span>
            </li>
          </ul>
          <Link href="/vendor/products" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
            Manage products →
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/vendor/products/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              + Add product
            </Link>
            <Link
              href="/vendor/orders"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              View orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusNotice({ status, name }: { status: string; name: string }) {
  const copy: Record<string, { title: string; body: string; tone: string }> = {
    pending: {
      title: "Application under review",
      body: `Thanks for applying, ${name}. An admin is reviewing your store — you'll get access to the full seller dashboard once it's approved.`,
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    },
    suspended: {
      title: "Store suspended",
      body: `${name} is currently suspended and hidden from the storefront. Contact the marketplace admin to resolve this.`,
      tone: "bg-orange-50 text-orange-800 border-orange-200",
    },
    rejected: {
      title: "Application not approved",
      body: `Unfortunately your application for ${name} wasn't approved. Reach out to the marketplace admin if you think this is a mistake.`,
      tone: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const c = copy[status] ?? copy.pending;
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Seller Center</h1>
      <div className={`mt-6 rounded-xl border p-6 ${c.tone}`}>
        <h2 className="text-lg font-semibold">{c.title}</h2>
        <p className="mt-2 text-sm">{c.body}</p>
      </div>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
        ← Back to store
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-300">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
