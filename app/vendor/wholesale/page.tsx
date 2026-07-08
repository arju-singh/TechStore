import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getProductsByVendor } from "@/lib/products";
import { formatINR } from "@/lib/format";
import WholesaleTierEditor from "@/components/vendor/WholesaleTierEditor";

export const metadata: Metadata = { title: "Wholesale pricing" };

export default async function VendorWholesalePage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");
  const products = await getProductsByVendor(ctx.vendor.slug);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Wholesale pricing</h1>
        <p className="mt-1 text-sm text-white/50">
          Set quantity-based wholesale tiers per product. Approved wholesalers see
          these prices in the wholesale catalog.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          List a product first, then set its wholesale pricing here.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const tierCount = p.wholesale?.tiers?.length ?? 0;
            return (
              <div key={p.slug} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-white/80">{p.name}</div>
                    <div className="text-xs text-white/40">
                      Retail {formatINR(p.price)} ·{" "}
                      {p.wholesale?.enabled
                        ? `wholesale ${tierCount} tier${tierCount === 1 ? "" : "s"}, MOQ ${p.wholesale.moq}`
                        : "no wholesale pricing"}
                    </div>
                  </div>
                  <WholesaleTierEditor
                    slug={p.slug}
                    price={p.price}
                    initial={{
                      enabled: Boolean(p.wholesale?.enabled),
                      moq: p.wholesale?.moq ?? 1,
                      tiers: p.wholesale?.tiers ?? [],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
