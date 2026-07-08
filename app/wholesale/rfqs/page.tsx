import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import { getRfqsForWholesaler } from "@/lib/rfqs";
import { getCreditTerms } from "@/lib/creditTerms";
import { formatINR } from "@/lib/format";
import RfqConvertButton from "@/components/wholesale/RfqConvertButton";

export const metadata: Metadata = { title: "My quotes" };

const BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  countered: "bg-blue-50 text-blue-700",
};

export default async function WholesaleRfqsPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");
  const [rfqs, terms] = await Promise.all([
    getRfqsForWholesaler(ctx.profile.id),
    getCreditTerms(ctx.profile.id),
  ]);
  const hasCredit = Boolean(terms && terms.creditLimit > 0 && terms.available > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My quote requests</h1>
        <p className="mt-1 text-sm text-white/50">
          {rfqs.length} request{rfqs.length === 1 ? "" : "s"}. Accepted or countered
          quotes can be ordered at the agreed price.
        </p>
      </div>

      {rfqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No quote requests yet. Request one from the catalog on any vendor product.
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((r) => {
            const canOrder =
              (r.status === "accepted" || r.status === "countered") &&
              r.agreedPrice > 0 &&
              !r.convertedOrderId;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-white/80">{r.productName}</div>
                    <div className="text-xs text-white/40">
                      {r.requestedQty} units
                      {r.proposedPrice > 0 ? ` · you proposed ₹${r.proposedPrice}/unit` : ""}
                      {r.agreedPrice > 0 ? ` · agreed ${formatINR(r.agreedPrice)}/unit` : ""}
                    </div>
                    {r.vendorNote && <p className="mt-1 text-sm text-white/70">Vendor: “{r.vendorNote}”</p>}
                    {r.convertedOrderId && (
                      <p className="mt-1 text-xs text-emerald-700">Converted to an order.</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE[r.status] ?? "bg-white/10 text-white/70"}`}>
                    {r.status}
                  </span>
                </div>
                {canOrder && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <RfqConvertButton
                      rfqId={r.id}
                      hasCredit={hasCredit}
                      defaultName={ctx.profile.businessName}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
