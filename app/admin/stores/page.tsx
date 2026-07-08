import Link from "next/link";
import type { Metadata } from "next";
import { getAllVendors } from "@/lib/vendors";
import { resolveCommissionRate, platformCommissionRate } from "@/lib/payouts";
import type { VendorStatus } from "@/lib/types";
import VendorStatusControl from "@/components/admin/VendorStatusControl";

export const metadata: Metadata = { title: "Stores" };

const STATUS_BADGE: Record<VendorStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  suspended: "bg-orange-50 text-orange-700",
  rejected: "bg-red-50 text-red-600",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
];

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const all = await getAllVendors();
  const platformDefault = platformCommissionRate();
  const pending = all.filter((v) => v.status === "pending").length;

  const active = status && FILTERS.some((f) => f.key === status) ? status : "all";
  const vendors = active === "all" ? all : all.filter((v) => v.status === active);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Stores</h1>
        <p className="mt-1 text-sm text-white/50">
          {all.length} vendor{all.length === 1 ? "" : "s"} · {pending} awaiting
          review · platform commission {platformDefault}%
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = active === f.key;
          const count =
            f.key === "all"
              ? all.length
              : all.filter((v) => v.status === f.key).length;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/stores" : `/admin/stores?status=${f.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {f.label} ({count})
            </Link>
          );
        })}
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No stores in this view yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-semibold">Store</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Commission</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/stores/${v.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {v.name}
                      </Link>
                      <div className="text-xs text-white/40">/{v.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white/70">{v.email || "—"}</div>
                      <div className="text-xs text-white/40">{v.phone || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {resolveCommissionRate(v)}%
                      {v.commissionRate === null && (
                        <span className="ml-1 text-xs text-white/40">(default)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[v.status]}`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <VendorStatusControl vendorId={v.id} status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
