import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerById } from "@/lib/wholesalers";
import { getCreditTerms } from "@/lib/creditTerms";
import { formatINR } from "@/lib/format";
import WholesalerStatusControl from "@/components/admin/WholesalerStatusControl";
import CreditTermsControl from "@/components/admin/CreditTermsControl";

export const metadata: Metadata = { title: "Wholesaler" };

export default async function AdminWholesalerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await getWholesalerById(id);
  if (!w) notFound();
  const terms = await getCreditTerms(w.id);

  const addr = (a: typeof w.businessAddress) =>
    [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/wholesalers" className="text-sm font-medium text-brand-600 hover:underline">
          ← Wholesalers
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{w.businessName}</h1>
            <p className="text-sm text-white/50 capitalize">
              {w.businessType.replace(/_/g, " ")} · {w.status.replace(/_/g, " ")}
            </p>
          </div>
          <WholesalerStatusControl wholesalerId={w.id} status={w.status} />
        </div>
      </div>

      {w.rejectionReason && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Last decision reason: {w.rejectionReason}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Business</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Owner" value={w.ownerName} />
            <Row label="GSTIN" value={w.taxNumber} />
            <Row label="Trade license" value={w.tradeLicenseNumber || "—"} />
            <Row label="Email" value={w.email} />
            <Row label="Phone" value={w.phone} />
            <Row label="Website" value={w.website || "—"} />
            <Row label="Expected/mo" value={w.expectedMonthlyPurchase ? formatINR(w.expectedMonthlyPurchase) : "—"} />
            <Row label="Membership" value={w.membershipTier} />
            <Row label="Loyalty points" value={String(w.loyaltyPoints)} />
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-semibold text-white">Addresses</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Business" value={addr(w.businessAddress)} />
            <Row label="Warehouse" value={addr(w.warehouseAddress)} />
          </dl>
          {w.categoriesInterested.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Categories</p>
              <p className="mt-1 text-sm capitalize text-white/70">
                {w.categoriesInterested.join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">Credit line</h2>
        <p className="mt-1 text-sm text-white/50">
          Set a credit limit to let this wholesaler pay on Net terms.
        </p>
        <div className="mt-3">
          <CreditTermsControl
            wholesalerId={w.id}
            creditLimit={terms?.creditLimit ?? 0}
            termsDays={terms?.termsDays ?? 30}
            currentBalance={terms?.currentBalance ?? 0}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-semibold text-white">
          Verification documents ({w.documents.length})
        </h2>
        {w.documents.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No documents uploaded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {w.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span className="text-white/70">
                  <span className="capitalize">{d.docType.replace(/_/g, " ")}</span>
                  <span className="text-white/40"> · {d.originalName}</span>
                </span>
                <a
                  href={`/api/admin/wholesalers/${w.id}/documents/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-right capitalize text-white/70">{value}</dd>
    </div>
  );
}
