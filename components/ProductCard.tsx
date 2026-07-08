import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/pricing";
import PriceTag from "./PriceTag";
import Stars from "./Stars";
import WishlistButton from "./WishlistButton";

export default function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
  const outOfStock = product.stock <= 0;
  const hasBulk =
    (product.priceTiers?.length ?? 0) > 0 || Boolean(product.wholesale?.enabled);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-transparent bg-white p-4 transition hover:border-amz-border hover:shadow-amz"
    >
      <div className="relative mx-auto aspect-square w-full overflow-hidden bg-white">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain transition duration-300 group-hover:scale-105"
        />
        {off > 0 && (
          <span className="absolute left-1 top-1 rounded bg-amz-deal px-1.5 py-0.5 text-xs font-bold text-white">
            {off}% off
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-white/85 py-1 text-center text-xs font-bold text-amz-deal">
            Out of stock
          </span>
        )}
        <WishlistButton product={product} className="absolute right-1 top-1" />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium text-ink group-hover:text-amz-linkH">
          {product.name}
        </h3>
        <Stars rating={product.rating} numReviews={product.numReviews} />
        <div className="mt-1">
          <PriceTag mrp={product.mrp} price={product.price} size="sm" />
        </div>
        {hasBulk && (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
            Bulk &amp; wholesale deals
          </span>
        )}
        {product.stock > 0 && (
          <span className="mt-1 text-xs text-amz-link">
            Get it in {2 + (product.slug.length % 4)}–{4 + (product.slug.length % 4)} days
          </span>
        )}
      </div>
    </Link>
  );
}
