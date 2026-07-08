import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getProductsByVendor } from "@/lib/products";
import { formatINR } from "@/lib/format";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = { title: "Products" };

export default async function VendorProductsPage() {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");
  const products = await getProductsByVendor(ctx.vendor.slug);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="mt-1 text-sm text-white/50">
            {products.length} listed in {ctx.vendor.name}
          </p>
        </div>
        <Link
          href="/vendor/products/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <p className="text-sm text-white/50">You haven't listed any products yet.</p>
          <Link
            href="/vendor/products/new"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            List your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {products.map((p) => (
                  <tr key={p.slug} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/10">
                          <Image src={p.image} alt={p.name} fill sizes="40px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white/80">{p.name}</div>
                          <div className="text-xs text-white/40">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-white/70">{p.category}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white/80">{formatINR(p.price)}</div>
                      {p.mrp > p.price && (
                        <div className="text-xs text-white/40 line-through">{formatINR(p.mrp)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StockPill stock={p.stock} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/vendor/products/${p.slug}/edit`}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteProductButton
                          slug={p.slug}
                          name={p.name}
                          basePath="/api/vendor/products"
                        />
                      </div>
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

function StockPill({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Out</span>;
  if (stock <= 10)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">{stock} left</span>;
  return <span className="text-white/70">{stock}</span>;
}
