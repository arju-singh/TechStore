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
import ReviewsSection from "@/components/ReviewsSection";
import RecordRecentlyViewed from "@/components/RecordRecentlyViewed";
import RecentlyViewed from "@/components/RecentlyViewed";
import Countdown from "@/components/Countdown";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { getCurrentUser } from "@/lib/auth";
import { getReviews, getReviewSummary, getUserReview } from "@/lib/reviews";
import { getFlashPriceMap, applyFlashSale, applyFlashToProducts } from "@/lib/flashSales";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: false } };
  }
  const canonical = `/product/${product.slug}`;
  const description =
    product.description ||
    `Buy ${product.name} by ${product.brand} at TechStore.`;
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: canonical,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rawProduct = await getProductBySlug(slug);
  if (!rawProduct) notFound();

  const [flashMap, relatedRaw, category, reviews, reviewSummary, currentUser] =
    await Promise.all([
      getFlashPriceMap(),
      getRelatedProducts(rawProduct),
      getCategory(rawProduct.category),
      getReviews(rawProduct.slug),
      getReviewSummary(rawProduct.slug),
      getCurrentUser(),
    ]);
  // Apply active flash-sale pricing so the whole PDP (price, add-to-cart snapshot,
  // JSON-LD) reflects the sale — the checkout re-applies it server-side too.
  const product = applyFlashSale(rawProduct, flashMap);
  const related = applyFlashToProducts(relatedRaw, flashMap);
  const myReview = currentUser ? await getUserReview(product.slug, currentUser.id) : null;

  const off = discountPercent(product);
  const saved = product.mrp - product.price;
  const inStock = product.stock > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <RecordRecentlyViewed slug={product.slug} />
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
          ...(category
            ? [{ name: category.name, url: `/products?category=${category.slug}` }]
            : []),
          { name: product.name, url: `/product/${product.slug}` },
        ]}
      />
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-white/50">
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
        <span className="text-white/70">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-8"
            priority
          />
          {off > 0 && (
            <span className="absolute left-4 top-4 rounded-full bg-brand-400 px-3 py-1 text-sm font-semibold text-black">
              {off}% OFF
            </span>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-sm font-medium uppercase tracking-wide text-brand-600">
            {product.brand}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-3">
            <Stars rating={product.rating} numReviews={product.numReviews} />
          </div>

          {product.flashSale && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
                </svg>
                Flash sale
                <span className="font-normal text-white/50">
                  · was {formatINR(product.flashSale.originalPrice)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-white/50">Ends in</span>
                <Countdown endsAt={product.flashSale.endsAt} />
              </span>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-white/5 p-5">
            <PriceTag mrp={product.mrp} price={product.price} size="lg" />
            {saved > 0 && (
              <p className="mt-1 text-sm font-medium text-green-600">
                You save {formatINR(saved)}
              </p>
            )}
            <p className="mt-2 text-xs text-white/40">
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

          {product.vendorSlug && product.vendorName && (
            <p className="mt-3 text-sm text-white/50">
              Sold by{" "}
              <Link
                href={`/store/${product.vendorSlug}`}
                className="font-medium text-brand-600 hover:underline"
              >
                {product.vendorName}
              </Link>
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-white/60">
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
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center text-xs text-white/50">
            <Badge title="Free delivery" sub="Over ₹499" />
            <Badge title="COD available" sub="Pay on delivery" />
            <Badge title="7-day returns" sub="Easy & free" />
          </div>
        </div>
      </div>

      {/* Specs */}
      {Object.keys(product.specs).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-white">Specifications</h2>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/10">
                {Object.entries(product.specs).map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-1/3 bg-white/5 px-5 py-3 font-medium text-white/60">
                      {k}
                    </td>
                    <td className="px-5 py-3 text-white/80">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ratings & reviews */}
      <ReviewsSection
        productSlug={product.slug}
        currentUser={currentUser ? { id: currentUser.id, name: currentUser.name } : null}
        initialReviews={reviews}
        initialSummary={reviewSummary}
        initialMine={myReview}
      />

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-white">
            You might also like
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed (excludes this product) */}
      <div className="mt-12">
        <RecentlyViewed excludeSlug={product.slug} />
      </div>
    </div>
  );
}

function Badge({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="font-semibold text-white/70">{title}</div>
      <div>{sub}</div>
    </div>
  );
}
