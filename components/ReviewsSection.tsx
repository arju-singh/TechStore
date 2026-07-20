"use client";

import { useState } from "react";
import Link from "next/link";
import Stars from "@/components/Stars";
import type { Review, ReviewSummary } from "@/lib/reviewShared";
import { REVIEW_LIMITS } from "@/lib/reviewShared";

const EMPTY_SUMMARY: ReviewSummary = {
  average: 0,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ReviewsSection({
  productSlug,
  currentUser,
  initialReviews,
  initialSummary,
  initialMine,
}: {
  productSlug: string;
  currentUser: { id: string; name: string } | null;
  initialReviews: Review[];
  initialSummary: ReviewSummary;
  initialMine: Review | null;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [summary, setSummary] = useState<ReviewSummary>(initialSummary ?? EMPTY_SUMMARY);
  const [mine, setMine] = useState<Review | null>(initialMine);

  const canWrite = Boolean(currentUser) && !mine;

  return (
    <section className="mt-12" id="reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-4 text-xl font-bold text-white">
        Ratings &amp; reviews
      </h2>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <SummaryPanel summary={summary} />

        <div className="min-w-0">
          {canWrite && (
            <ReviewForm
              productSlug={productSlug}
              onCreated={(review, newSummary) => {
                setReviews((prev) => [review, ...prev]);
                setMine(review);
                setSummary(newSummary);
              }}
            />
          )}

          {!currentUser && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/60">
              <Link
                href={`/login?redirect=/product/${productSlug}%23reviews`}
                className="font-semibold text-brand-400 hover:underline"
              >
                Sign in
              </Link>{" "}
              to write a review.
            </div>
          )}

          <ReviewList
            reviews={reviews}
            currentUserId={currentUser?.id ?? null}
            productSlug={productSlug}
            onDeleted={(id, newSummary) => {
              setReviews((prev) => prev.filter((r) => r.id !== id));
              if (mine?.id === id) setMine(null);
              setSummary(newSummary);
            }}
          />
        </div>
      </div>
    </section>
  );
}

function SummaryPanel({ summary }: { summary: ReviewSummary }) {
  const { average, count, distribution } = summary;
  return (
    <div className="h-fit rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-white">
          {count ? average.toFixed(1) : "—"}
        </div>
        <div>
          <Stars rating={average} />
          <p className="mt-1 text-xs text-white/50">
            {count} {count === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const n = distribution[star] ?? 0;
          const pct = count ? Math.round((n / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-6 tabular-nums">{star}★</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-amz-star"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({
  productSlug,
  onCreated,
}: {
  productSlug: string;
  onCreated: (review: Review, summary: ReviewSummary) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    if (body.trim().length < REVIEW_LIMITS.bodyMin) {
      setError(`Your review is too short (min ${REVIEW_LIMITS.bodyMin} characters).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save your review.");
      onCreated(data.review, data.summary);
      setRating(0);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const shown = hover || rating;

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
    >
      <h3 className="text-sm font-semibold text-white">Write a review</h3>

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-0.5 transition"
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-7 w-7 ${n <= shown ? "text-amz-star" : "text-white/15"}`}
              fill="currentColor"
            >
              <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 0 0 .95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 0 0-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.59a1 1 0 0 0-1.18 0l-3.56 2.59c-.78.57-1.83-.2-1.54-1.12l1.36-4.18a1 1 0 0 0-.36-1.12L1.15 9.6c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 0 0 .95-.69L8.45 2.93Z" />
            </svg>
          </button>
        ))}
        <span className="ml-2 text-sm text-white/50">{rating > 0 ? `${rating}/5` : ""}</span>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={REVIEW_LIMITS.titleMax}
        placeholder="Add a headline (optional)"
        aria-label="Review headline"
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={REVIEW_LIMITS.bodyMax}
        rows={4}
        placeholder="What did you like or dislike? How was the quality?"
        aria-label="Your review"
        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30"
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-white/30">
          {body.length}/{REVIEW_LIMITS.bodyMax}
        </span>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Posting…" : "Post review"}
        </button>
      </div>
    </form>
  );
}

function ReviewList({
  reviews,
  currentUserId,
  productSlug,
  onDeleted,
}: {
  reviews: Review[];
  currentUserId: string | null;
  productSlug: string;
  onDeleted: (id: string, summary: ReviewSummary) => void;
}) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/50">
        No reviews yet. Be the first to share your experience.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <ReviewRow
          key={r.id}
          review={r}
          canDelete={currentUserId === r.userId}
          productSlug={productSlug}
          onDeleted={onDeleted}
        />
      ))}
    </ul>
  );
}

function ReviewRow({
  review,
  canDelete,
  productSlug,
  onDeleted,
}: {
  review: Review;
  canDelete: boolean;
  productSlug: string;
  onDeleted: (id: string, summary: ReviewSummary) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productSlug}/reviews/${review.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) onDeleted(review.id, data.summary);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={review.rating} />
            <span className="text-sm font-semibold text-white">{review.userName}</span>
            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-400/10 px-2 py-0.5 text-[11px] font-medium text-brand-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2.5}>
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified purchase
              </span>
            )}
          </div>
          {review.title && (
            <p className="mt-2 font-semibold text-white/90">{review.title}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-white/40">{formatDate(review.createdAt)}</span>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/70">
        {review.body}
      </p>

      {canDelete && (
        <button
          onClick={remove}
          disabled={deleting}
          className="mt-3 text-xs font-medium text-white/40 transition hover:text-red-400 disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Delete my review"}
        </button>
      )}
    </li>
  );
}
