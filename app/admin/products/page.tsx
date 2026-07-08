import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import { formatINR } from "@/lib/format";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">{products.length} products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add product
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.slug} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        <Image src={p.image} alt={p.name} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.category}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{formatINR(p.price)}</div>
                    {p.mrp > p.price && (
                      <div className="text-xs text-slate-400 line-through">{formatINR(p.mrp)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StockPill stock={p.stock} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/products/${p.slug}/edit`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton slug={p.slug} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockPill({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Out</span>;
  if (stock <= 10)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">{stock} left</span>;
  return <span className="text-slate-600">{stock}</span>;
}
