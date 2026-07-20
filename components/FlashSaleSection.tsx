import Link from "next/link";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import Countdown from "./Countdown";

/**
 * Homepage flash-sale module: a bold banner with a live countdown to the sale's
 * end, plus the discounted product cards. Server component; the countdown is a
 * client child. Renders nothing when there are no active flash products.
 */
export default function FlashSaleSection({
  title,
  endsAt,
  products,
  limit = 6,
}: {
  title: string;
  endsAt: string;
  products: Product[];
  limit?: number;
}) {
  const items = products.slice(0, limit);
  if (items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.08] to-transparent p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-brand-400 text-black">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-xs text-white/50">Limited-time prices — while they last</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">Ends in</span>
          <Countdown endsAt={endsAt} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>

      <div className="mt-5 text-right">
        <Link href="/deals" className="text-sm font-medium text-brand-400 transition hover:text-brand-300">
          See all deals →
        </Link>
      </div>
    </section>
  );
}
