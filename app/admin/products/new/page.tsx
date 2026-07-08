import Link from "next/link";
import type { Metadata } from "next";
import { getCategories } from "@/lib/products";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <Link href="/admin/products" className="text-sm font-medium text-brand-600 hover:underline">
        ← Products
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-white">Add product</h1>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <ProductForm mode="create" categories={categories} />
      </div>
    </div>
  );
}
