import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReviewById, deleteReview, getReviewSummary } from "@/lib/reviews";

/** DELETE a review. Allowed for the review's author or an admin. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const review = await getReviewById(id);
  if (!review || review.productSlug !== slug) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const isOwner = review.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await deleteReview(id);
  const summary = await getReviewSummary(slug);
  return NextResponse.json({ ok: true, summary });
}
