import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import ReviewModel from "@/lib/models/Review";
import type {
  Review,
  ReviewStatus,
  ReviewSummary,
  CreateReviewInput,
} from "@/lib/reviewShared";

// Re-export the client-safe types + constants so server callers can keep
// importing them from "@/lib/reviews" (this module owns the DB access).
export type { Review, ReviewStatus, ReviewSummary, CreateReviewInput } from "@/lib/reviewShared";
export { REVIEW_LIMITS } from "@/lib/reviewShared";
import { REVIEW_LIMITS } from "@/lib/reviewShared";

/*
 * In-memory fallback so reviews work with no MONGODB_URI, mirroring the rest of
 * the retail data layer (products/users/orders). Resets on restart; single
 * process only. The wholesale module is DB-only, but reviews are core retail, so
 * they follow the retail fallback convention.
 */
declare global {
  // eslint-disable-next-line no-var
  var _memReviews: Review[] | undefined;
  // eslint-disable-next-line no-var
  var _memReviewSeq: number | undefined;
}
function memReviews(): Review[] {
  if (!global._memReviews) global._memReviews = [];
  return global._memReviews;
}
function nextMemId(): string {
  global._memReviewSeq = (global._memReviewSeq ?? 0) + 1;
  return `memrev_${global._memReviewSeq}`;
}

function emptyDistribution(): Record<1 | 2 | 3 | 4 | 5, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function toPlainReview(doc: any): Review {
  return {
    id: String(doc._id ?? doc.id),
    productSlug: doc.productSlug,
    userId: String(doc.userId),
    userName: doc.userName,
    rating: Number(doc.rating),
    title: doc.title ?? "",
    body: doc.body ?? "",
    status: (doc.status as ReviewStatus) ?? "published",
    verifiedPurchase: Boolean(doc.verifiedPurchase),
    helpfulCount: Number(doc.helpfulCount ?? 0),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt ?? new Date(0).toISOString(),
  };
}

function summarize(published: Review[]): ReviewSummary {
  const distribution = emptyDistribution();
  let sum = 0;
  for (const r of published) {
    const band = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[band] += 1;
    sum += r.rating;
  }
  const count = published.length;
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    distribution,
  };
}

function byNewest(a: Review, b: Review): number {
  return b.createdAt.localeCompare(a.createdAt);
}

/** Published reviews for a product, newest first. */
export async function getReviews(productSlug: string): Promise<Review[]> {
  if (!hasDatabase) {
    return memReviews()
      .filter((r) => r.productSlug === productSlug && r.status === "published")
      .sort(byNewest);
  }
  await connectToDatabase();
  const docs = await ReviewModel.find({ productSlug, status: "published" })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(toPlainReview);
}

/** Aggregate rating + star distribution over a product's published reviews. */
export async function getReviewSummary(productSlug: string): Promise<ReviewSummary> {
  const published = await getReviews(productSlug);
  return summarize(published);
}

/** The current user's own review for a product (any status), or null. */
export async function getUserReview(
  productSlug: string,
  userId: string
): Promise<Review | null> {
  if (!hasDatabase) {
    return (
      memReviews().find((r) => r.productSlug === productSlug && r.userId === userId) ??
      null
    );
  }
  await connectToDatabase();
  const doc = await ReviewModel.findOne({ productSlug, userId }).lean();
  return doc ? toPlainReview(doc) : null;
}

export async function getReviewById(id: string): Promise<Review | null> {
  if (!hasDatabase) {
    return memReviews().find((r) => r.id === id) ?? null;
  }
  await connectToDatabase();
  const doc = await ReviewModel.findById(id)
    .lean()
    .catch(() => null);
  return doc ? toPlainReview(doc) : null;
}

/**
 * Create a review. Rejects a duplicate (one per user per product) with a clear
 * error. Input is assumed already validated/sanitized by the caller (the API
 * route), including the trusted `verifiedPurchase` flag.
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const title = (input.title ?? "").trim().slice(0, REVIEW_LIMITS.titleMax);
  const body = input.body.trim().slice(0, REVIEW_LIMITS.bodyMax);
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  const existing = await getUserReview(input.productSlug, input.userId);
  if (existing) {
    throw new Error("You've already reviewed this product.");
  }

  if (!hasDatabase) {
    const review: Review = {
      id: nextMemId(),
      productSlug: input.productSlug,
      userId: input.userId,
      userName: input.userName,
      rating,
      title,
      body,
      status: "published",
      verifiedPurchase: input.verifiedPurchase,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
    };
    memReviews().unshift(review);
    return review;
  }

  await connectToDatabase();
  try {
    const doc = await ReviewModel.create({
      productSlug: input.productSlug,
      userId: input.userId,
      userName: input.userName,
      rating,
      title,
      body,
      verifiedPurchase: input.verifiedPurchase,
    });
    return toPlainReview(doc.toObject());
  } catch (err: any) {
    // Unique index violation → duplicate review (race with the check above).
    if (err?.code === 11000) {
      throw new Error("You've already reviewed this product.");
    }
    throw err;
  }
}

/** Delete a review. Only the author or an admin may do so (enforced by caller). */
export async function deleteReview(id: string): Promise<boolean> {
  if (!hasDatabase) {
    const list = memReviews();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }
  await connectToDatabase();
  const res = await ReviewModel.deleteOne({ _id: id });
  return res.deletedCount > 0;
}

/** Admin moderation: publish/hide a review. */
export async function setReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<Review | null> {
  if (!hasDatabase) {
    const review = memReviews().find((r) => r.id === id);
    if (!review) return null;
    review.status = status;
    return review;
  }
  await connectToDatabase();
  const doc = await ReviewModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
  return doc ? toPlainReview(doc) : null;
}

/** Every review across all products, newest first — for the admin moderation queue. */
export async function getAllReviews(): Promise<Review[]> {
  if (!hasDatabase) {
    return [...memReviews()].sort(byNewest);
  }
  await connectToDatabase();
  const docs = await ReviewModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(toPlainReview);
}
