import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProductBySlug } from "@/lib/products";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getProductBySlug(slug),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-medium text-brand-600 hover:underline">
        ← Products
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-slate-900">
        Edit: {product.name}
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <ProductForm mode="edit" categories={categories} initial={product} />
      </div>
    </div>
  );
}
