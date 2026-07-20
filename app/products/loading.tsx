import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="card space-y-3 p-4">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <Skeleton className="mt-4 h-4 w-16" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </aside>

        <div className="flex-1">
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
