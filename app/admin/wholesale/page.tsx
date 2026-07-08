import type { Metadata } from "next";
import { listWholesaleApplicants } from "@/lib/users";
import WholesaleControl from "@/components/admin/WholesaleControl";

export const metadata: Metadata = { title: "Wholesale applications" };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  none: "bg-slate-100 text-slate-500",
};

export default async function AdminWholesalePage() {
  const applicants = await listWholesaleApplicants();
  const pending = applicants.filter((a) => a.wholesaleStatus === "pending").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Wholesale applications</h1>
        <p className="mt-1 text-sm text-slate-500">
          {applicants.length} total · {pending} awaiting review
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No wholesale applications yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">GSTIN</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {a.companyName || "—"}
                      </div>
                      <div className="text-xs text-slate-400">{a.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{a.email}</div>
                      <div className="text-xs text-slate-400">
                        {a.businessPhone || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.gstin || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_BADGE[a.wholesaleStatus] ?? STATUS_BADGE.none
                        }`}
                      >
                        {a.wholesaleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WholesaleControl userId={a.id} status={a.wholesaleStatus} />
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
