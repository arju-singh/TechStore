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
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition duration-300 ease-out hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
    >
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl bg-white">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-contain p-4 transition duration-500 ease-out group-hover:scale-[1.06]"
        />
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-400 px-2 py-0.5 text-[11px] font-bold text-black">
            −{off}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-semibold text-white backdrop-blur">
            Out of stock
          </span>
        )}
        <WishlistButton product={product} className="absolute right-2 top-2" />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide text-white/40">
          {product.brand}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-white/90 transition group-hover:text-white">
          {product.name}
        </h3>
        <div className="mt-0.5">
          <Stars rating={product.rating} numReviews={product.numReviews} />
        </div>
        <div className="mt-1">
          <PriceTag mrp={product.mrp} price={product.price} size="sm" />
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {hasBulk && (
            <span className="inline-flex w-fit items-center rounded-full border border-brand-400/30 bg-brand-400/10 px-2 py-0.5 text-[11px] font-semibold text-brand-300">
              Bulk pricing
            </span>
          )}
          {product.vendorName && (
            <span className="text-[11px] text-white/40">Sold by {product.vendorName}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
