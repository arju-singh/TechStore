import Link from "next/link";
import type { Metadata } from "next";
import { getAllWholesalers } from "@/lib/wholesalers";
import type { WholesalerStatus } from "@/lib/wholesalers";
import WholesalerStatusControl from "@/components/admin/WholesalerStatusControl";

export const metadata: Metadata = { title: "Wholesalers" };

const BADGE: Record<WholesalerStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  needs_docs: "bg-orange-50 text-orange-700",
  suspended: "bg-orange-50 text-orange-700",
  blacklisted: "bg-white/10 text-white/70",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "needs_docs", label: "Needs docs" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
  { key: "blacklisted", label: "Blacklisted" },
];

export default async function AdminWholesalersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const all = await getAllWholesalers();
  const pending = all.filter((w) => w.status === "pending").length;
  const active = status && FILTERS.some((f) => f.key === status) ? status : "all";
  const rows = active === "all" ? all : all.filter((w) => w.status === active);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesalers</h1>
        <p className="mt-1 text-sm text-white/50">
          {all.length} total · {pending} awaiting review
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? all.length : all.filter((w) => w.status === f.key).length;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/wholesalers" : `/admin/wholesalers?status=${f.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                active === f.key ? "bg-brand-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {f.label} ({count})
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No wholesalers in this view yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">GSTIN</th>
                  <th className="px-4 py-3 font-semibold">Docs</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((w) => (
                  <tr key={w.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/admin/wholesalers/${w.id}`} className="font-medium text-brand-700 hover:underline">
                        {w.businessName}
                      </Link>
                      <div className="text-xs text-white/40">
                        {w.ownerName} · {w.businessType.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{w.taxNumber}</td>
                    <td className="px-4 py-3 text-white/70">{w.documents.length}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE[w.status]}`}>
                        {w.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WholesalerStatusControl wholesalerId={w.id} status={w.status} />
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
