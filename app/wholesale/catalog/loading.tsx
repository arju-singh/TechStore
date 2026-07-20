import { Skeleton, ProductGridSkeleton } from "@/components/Skeleton";

export default function WholesaleCatalogLoading() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-6">
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
