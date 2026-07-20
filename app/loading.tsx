import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

/**
 * Global route-loading fallback. Also stands in for any route without its own
 * loading.tsx, so navigation always shows structure instead of a blank frame.
 */
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-10">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-12 w-3/4 max-w-2xl" />
        <Skeleton className="mt-3 h-12 w-2/3 max-w-xl" />
        <Skeleton className="mt-5 h-4 w-96 max-w-full" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 w-44 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>

      {/* Category rail */}
      <div className="mb-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-40 shrink-0 rounded-2xl" />
        ))}
      </div>

      {/* Featured grid */}
      <Skeleton className="mb-4 h-6 w-40" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
