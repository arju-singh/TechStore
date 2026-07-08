import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getRfqsForVendor } from "@/lib/rfqs";
import { formatINR } from "@/lib/format";
import RfqResponder from "@/components/vendor/RfqResponder";

export const metadata: Metadata = { title: "Quotes (RFQ)" };

const BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  countered: "bg-blue-50 text-blue-700",
};

export default async function VendorRfqsPage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");
  const rfqs = await getRfqsForVendor(ctx.vendor.slug);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Quote requests (RFQ)</h1>
        <p className="mt-1 text-sm text-white/50">
          {rfqs.length} request{rfqs.length === 1 ? "" : "s"} from wholesalers.
          Accept, reject, or counter — an accepted quote lets them order at the
          agreed price.
        </p>
      </div>

      {rfqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No quote requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-white/80">{r.productName}</div>
                  <div className="text-xs text-white/40">
                    {r.businessName || "Wholesaler"} · {r.requestedQty} units
                    {r.proposedPrice > 0 ? ` · proposed ₹${r.proposedPrice}/unit` : ""}
                  </div>
                  {r.notes && <p className="mt-1 text-sm text-white/70">“{r.notes}”</p>}
                  {r.status === "countered" && (
                    <p className="mt-1 text-xs text-blue-700">
                      You countered at {formatINR(r.vendorCounterPrice)}/unit.
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE[r.status] ?? "bg-white/10 text-white/70"}`}>
                  {r.status}
                </span>
              </div>
              {(r.status === "pending" || r.status === "countered") && (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <RfqResponder rfqId={r.id} proposedPrice={r.proposedPrice} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
