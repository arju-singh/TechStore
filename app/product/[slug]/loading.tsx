import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-6 h-4 w-72" />

      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />

        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-4/5" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-6 h-28 w-full rounded-xl" />
          <Skeleton className="mt-4 h-5 w-32" />
          <Skeleton className="mt-6 h-20 w-full" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </div>

      <section className="mt-12">
        <Skeleton className="mb-4 h-6 w-48" />
        <ProductGridSkeleton count={4} />
      </section>
    </div>
  );
}
