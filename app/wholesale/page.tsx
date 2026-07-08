import Link from "next/link";
import { redirect } from "next/navigation";
import { getWholesalerUser } from "@/lib/auth";
import { getOrdersByUser } from "@/lib/orders";
import { getCreditTerms } from "@/lib/creditTerms";
import { getRfqsForWholesaler } from "@/lib/rfqs";
import { formatINR } from "@/lib/format";

export default async function WholesaleDashboardPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const { user, profile } = ctx;

  const [allOrders, terms, rfqs] = await Promise.all([
    getOrdersByUser(user.id),
    getCreditTerms(profile.id),
    getRfqsForWholesaler(profile.id),
  ]);
  const orders = allOrders.filter((o) => o.orderType === "wholesale");
  const pendingRfqs = rfqs.filter((r) => r.status === "pending" || r.status === "countered").length;
  const spent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        Welcome, {profile.businessName}
      </h1>
      <p className="mt-1 text-sm text-white/50 capitalize">
        {profile.membershipTier !== "none" ? `${profile.membershipTier} member · ` : ""}
        approved wholesaler
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Wholesale orders" value={String(orders.length)} href="/wholesale/orders" />
        <Stat label="Total purchased" value={formatINR(spent)} />
        <Stat
          label="Credit available"
          value={terms ? formatINR(terms.available) : "—"}
          sub={terms ? `of ${formatINR(terms.creditLimit)} · Net-${terms.termsDays}` : "no credit line"}
        />
        <Stat label="Reward points" value={String(profile.loyaltyPoints)} href="/wholesale/loyalty" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/wholesale/catalog" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Browse catalog
            </Link>
            <Link href="/wholesale/cart" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5">
              Bulk cart
            </Link>
            <Link href="/wholesale/rfqs" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5">
              My quotes {pendingRfqs > 0 && <span className="text-brand-600">({pendingRfqs})</span>}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Recent orders</h2>
          {orders.length === 0 ? (
            <p className="mt-2 text-sm text-white/50">No wholesale orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10 text-sm">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <Link href={`/order/${o.id}`} className="text-white/70 hover:text-brand-700">
                    #{o.id.slice(-6)} · {o.createdAt.slice(0, 10)}
                  </Link>
                  <span className="font-medium text-white/80">{formatINR(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-300">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
