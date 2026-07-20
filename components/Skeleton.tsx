/**
 * Loading-skeleton primitives, styled to the dark design system. These render
 * instantly via Next's route-level `loading.tsx` (Suspense) while the server
 * component streams, so navigation never shows a blank screen.
 *
 * All shimmer uses `animate-pulse`, which is disabled by the global
 * prefers-reduced-motion rule in globals.css.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] ${className}`}
      aria-hidden="true"
    />
  );
}

/** Mirrors the ProductCard footprint so the grid doesn't reflow when data lands. */
export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mt-3 h-9 w-full rounded-full" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
