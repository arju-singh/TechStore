import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { setReviewStatus, deleteReview, getReviewById } from "@/lib/reviews";

/** Admin moderation: publish or hide a review. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const status = (payload as { status?: unknown })?.status;
  if (status !== "published" && status !== "hidden") {
    return NextResponse.json(
      { error: "status must be 'published' or 'hidden'." },
      { status: 400 }
    );
  }

  const review = await setReviewStatus(id, status);
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ review });
}

/** Admin moderation: permanently delete a review. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  await deleteReview(id);
  return NextResponse.json({ ok: true });
}
