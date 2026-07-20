import type { Metadata } from "next";
import { getAllReviews } from "@/lib/reviews";
import ReviewModerationTable from "@/components/admin/ReviewModerationTable";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await getAllReviews();
  const published = reviews.filter((r) => r.status === "published").length;
  const hidden = reviews.length - published;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <p className="mt-1 text-sm text-white/50">
          {reviews.length} total · {published} published · {hidden} hidden. Hide
          a review to remove it from the storefront without deleting it.
        </p>
      </div>
      <ReviewModerationTable initialReviews={reviews} />
    </div>
  );
}
