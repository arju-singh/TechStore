import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorBySlug } from "@/lib/vendors";
import { getProductsByVendor } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor || vendor.status !== "approved") return { title: "Store not found" };
  return {
    title: `${vendor.name} · Store`,
    description: vendor.description || `Products sold by ${vendor.name} on TechStore.`,
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  // Only approved stores are publicly visible.
  if (!vendor || vendor.status !== "approved") notFound();

  const products = await getProductsByVendor(vendor.slug);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-white/50">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <Link href="/stores" className="hover:text-brand-600">Stores</Link>
        <span>/</span>
        <span className="text-white/70">{vendor.name}</span>
      </nav>

      {/* Store header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/10">
          {vendor.logo ? (
            <Image src={vendor.logo} alt={vendor.name} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/40">
              {vendor.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
          {vendor.description && (
            <p className="mt-1 text-sm text-white/70">{vendor.description}</p>
          )}
          <p className="mt-2 text-xs text-white/40">
            {products.length} product{products.length === 1 ? "" : "s"}
            {vendor.address.city ? ` · ships from ${vendor.address.city}` : ""}
          </p>
        </div>
      </div>

      {vendor.policies && (
        <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
          <span className="font-semibold text-white/70">Store policies:</span>{" "}
          {vendor.policies}
        </p>
      )}

      {/* Catalog */}
      <h2 className="mb-4 mt-8 text-xl font-bold text-white">
        Products from {vendor.name}
      </h2>
      {products.length === 0 ? (
        <div className="rounded-lg bg-white/[0.02] p-12 text-center shadow-soft">
          <p className="text-sm text-white/50">This store has no products listed yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/[0.02] p-3 shadow-soft sm:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
