import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getApprovedVendors } from "@/lib/vendors";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Stores",
  description: "Browse the independent sellers on the TechStore marketplace.",
};

export default async function StoresDirectoryPage() {
  const [vendors, products] = await Promise.all([
    getApprovedVendors(),
    getProducts(),
  ]);

  // Count listings per vendor in a single pass.
  const counts = products.reduce<Record<string, number>>((acc, p) => {
    const slug = p.vendorSlug ?? "";
    if (slug) acc[slug] = (acc[slug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Stores</h1>
        <p className="mt-1 text-sm text-white/50">
          {vendors.length} independent seller{vendors.length === 1 ? "" : "s"} on the
          marketplace.{" "}
          <Link href="/vendor/apply" className="font-medium text-brand-600 hover:underline">
            Sell on TechStore →
          </Link>
        </p>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center text-sm text-white/50">
          No stores yet. Be the first to{" "}
          <Link href="/vendor/apply" className="font-medium text-brand-600 hover:underline">
            open a store
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <Link
              key={v.id}
              href={`/store/${v.slug}`}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-brand-300 hover:shadow-soft"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
                {v.logo ? (
                  <Image src={v.logo} alt={v.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white/40">
                    {v.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-white">{v.name}</div>
                {v.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
                    {v.description}
                  </p>
                )}
                <div className="mt-1 text-xs text-white/40">
                  {counts[v.slug] ?? 0} product{(counts[v.slug] ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
