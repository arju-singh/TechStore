import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVendorUser } from "@/lib/auth";
import { getCategories, getProductBySlug } from "@/lib/products";
import ProductForm from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function VendorEditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const ctx = await getVendorUser();
  if (!ctx) redirect("/vendor");

  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getProductBySlug(slug),
    getCategories(),
  ]);
  // 404 for products that don't exist OR aren't this vendor's — no probing.
  if (!product || (product.vendorSlug ?? "") !== ctx.vendor.slug) notFound();

  return (
    <div>
      <Link href="/vendor/products" className="text-sm font-medium text-brand-600 hover:underline">
        ← Products
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-white">
        Edit: {product.name}
      </h1>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <ProductForm
          mode="edit"
          categories={categories}
          initial={product}
          basePath="/api/vendor/products"
          listPath="/vendor/products"
        />
      </div>
    </div>
  );
}
