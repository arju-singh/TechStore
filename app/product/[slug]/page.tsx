import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getRelatedProducts,
  getCategory,
  discountPercent,
} from "@/lib/products";
import { formatINR } from "@/lib/format";
import PriceTag from "@/components/PriceTag";
import Stars from "@/components/Stars";
import ProductCard from "@/components/ProductCard";
import ProductPurchase from "@/components/ProductPurchase";
import PincodeCheck from "@/components/PincodeCheck";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, category] = await Promise.all([
    getRelatedProducts(product),
    getCategory(product.category),
  ]);

  const off = discountPercent(product);
  const saved = product.mrp - product.price;
  const inStock = product.stock > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-600">Products</Link>
        {category && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${category.slug}`}
              className="hover:text-brand-600"
            >
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {off > 0 && (
            <span className="absolute left-4 top-4 rounded-lg bg-brand-600 px-3 py-1 text-sm font-semibold text-white">
              {off}% OFF
            </span>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-sm font-medium uppercase tracking-wide text-brand-600">
            {product.brand}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3">
            <Stars rating={product.rating} numReviews={product.numReviews} />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-5">
            <PriceTag mrp={product.mrp} price={product.price} size="lg" />
            {saved > 0 && (
              <p className="mt-1 text-sm font-medium text-green-600">
                You save {formatINR(saved)}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Inclusive of all taxes
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                In stock ({product.stock} left)
              </span>
            ) : (
              <span className="font-medium text-red-500">Out of stock</span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {product.description}
          </p>

          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          {/* Pincode delivery check */}
          <div className="mt-6">
            <PincodeCheck />
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
            <Badge title="Free delivery" sub="Over ₹499" />
            <Badge title="COD available" sub="Pay on delivery" />
            <Badge title="7-day returns" sub="Easy & free" />
          </div>
        </div>
      </div>

      {/* Specs */}
      {Object.keys(product.specs).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Specifications</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(product.specs).map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-1/3 bg-slate-50 px-5 py-3 font-medium text-slate-600">
                      {k}
                    </td>
                    <td className="px-5 py-3 text-slate-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            You might also like
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Badge({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="font-semibold text-slate-700">{title}</div>
      <div>{sub}</div>
    </div>
  );
}
