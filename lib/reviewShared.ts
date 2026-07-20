/**
 * Client-safe review types and constants — NO database/mongoose imports, so this
 * is safe to import from client components. The server data layer (lib/reviews.ts)
 * re-exports everything here, so server code can keep importing from "@/lib/reviews".
 */

export type ReviewStatus = "published" | "hidden";

export interface Review {
  id: string;
  productSlug: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Number of published reviews at each star level, 1..5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface CreateReviewInput {
  productSlug: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  body: string;
  verifiedPurchase: boolean;
}

export const REVIEW_LIMITS = {
  titleMax: 100,
  bodyMin: 3,
  bodyMax: 2000,
} as const;
