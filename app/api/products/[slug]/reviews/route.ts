import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProductBySlug } from "@/lib/products";
import { getOrdersByUser } from "@/lib/orders";
import {
  getReviews,
  getReviewSummary,
  getUserReview,
  createReview,
  REVIEW_LIMITS,
} from "@/lib/reviews";
import { enforceRateLimit } from "@/lib/rateLimit";

// Order statuses that represent a real purchase of the item (not a cancelled
// order or an unconverted B2B quote). Used to stamp the "verified purchase" badge.
const PURCHASED_STATUSES = new Set([
  "pending",
  "confirmed",
  "paid",
  "shipped",
  "delivered",
  "credit_invoiced",
]);

/** GET published reviews + rating summary for a product (plus the caller's own). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const [reviews, summary, user] = await Promise.all([
    getReviews(slug),
    getReviewSummary(slug),
    getCurrentUser(),
  ]);
  const mine = user ? await getUserReview(slug, user.id) : null;
  return NextResponse.json({ reviews, summary, mine });
}

/** POST a new review. Requires auth; one review per user per product. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to write a review." },
      { status: 401 }
    );
  }

  const limited = enforceRateLimit(request, "review-write", 5, 60_000);
  if (limited) return limited;

  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { rating, title, body } = (payload ?? {}) as {
    rating?: unknown;
    title?: unknown;
    body?: unknown;
  };

  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json(
      { error: "Please choose a rating from 1 to 5 stars." },
      { status: 400 }
    );
  }
  const bodyText = typeof body === "string" ? body.trim() : "";
  if (bodyText.length < REVIEW_LIMITS.bodyMin) {
    return NextResponse.json(
      { error: `Your review is too short (min ${REVIEW_LIMITS.bodyMin} characters).` },
      { status: 400 }
    );
  }
  if (bodyText.length > REVIEW_LIMITS.bodyMax) {
    return NextResponse.json(
      { error: `Your review is too long (max ${REVIEW_LIMITS.bodyMax} characters).` },
      { status: 400 }
    );
  }
  const titleText = typeof title === "string" ? title.trim().slice(0, REVIEW_LIMITS.titleMax) : "";

  // Stamp verified-purchase from the user's real order history — never trusted
  // from the client.
  let verifiedPurchase = false;
  try {
    const orders = await getOrdersByUser(user.id);
    verifiedPurchase = orders.some(
      (o) =>
        PURCHASED_STATUSES.has(o.status) &&
        o.items.some((it) => it.slug === slug)
    );
  } catch {
    // A history lookup failure just means no verified badge — never block the write.
  }

  try {
    const review = await createReview({
      productSlug: slug,
      userId: user.id,
      userName: user.name,
      rating: ratingNum,
      title: titleText,
      body: bodyText,
      verifiedPurchase,
    });
    const summary = await getReviewSummary(slug);
    return NextResponse.json({ review, summary }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save your review.";
    const status = message.includes("already reviewed") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
