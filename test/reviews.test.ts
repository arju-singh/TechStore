import { describe, it, expect, beforeEach } from "vitest";
import {
  createReview,
  getReviews,
  getReviewSummary,
  getUserReview,
  getAllReviews,
  setReviewStatus,
  deleteReview,
} from "@/lib/reviews";

// The in-memory review store lives on globalThis; reset it before each test so
// cases are isolated. (MONGODB_URI is forced empty in vitest.config.ts, so the
// data layer runs its no-database path.)
beforeEach(() => {
  (globalThis as any)._memReviews = [];
  (globalThis as any)._memReviewSeq = 0;
});

const SLUG = "widget-1";

async function seedReview(over: Partial<Parameters<typeof createReview>[0]> = {}) {
  return createReview({
    productSlug: SLUG,
    userId: "u1",
    userName: "Alice",
    rating: 5,
    title: "Love it",
    body: "Works great, would buy again.",
    verifiedPurchase: true,
    ...over,
  });
}

describe("createReview + getReviews", () => {
  it("creates a published review and lists it", async () => {
    const r = await seedReview();
    expect(r.status).toBe("published");
    expect(r.verifiedPurchase).toBe(true);
    const list = await getReviews(SLUG);
    expect(list).toHaveLength(1);
    expect(list[0].userName).toBe("Alice");
  });

  it("clamps the rating to 1..5", async () => {
    const r = await seedReview({ userId: "u9", rating: 9 });
    expect(r.rating).toBe(5);
  });

  it("rejects a second review by the same user for the same product", async () => {
    await seedReview();
    await expect(seedReview()).rejects.toThrow(/already reviewed/i);
  });

  it("allows different users to review the same product", async () => {
    await seedReview({ userId: "u1", userName: "Alice" });
    await seedReview({ userId: "u2", userName: "Bob", rating: 3 });
    expect(await getReviews(SLUG)).toHaveLength(2);
  });
});

describe("getReviewSummary", () => {
  it("averages and builds the star distribution over published reviews", async () => {
    await seedReview({ userId: "u1", rating: 5 });
    await seedReview({ userId: "u2", rating: 4 });
    await seedReview({ userId: "u3", rating: 4 });
    const s = await getReviewSummary(SLUG);
    expect(s.count).toBe(3);
    expect(s.average).toBe(4.3); // (5+4+4)/3 = 4.33 → 4.3
    expect(s.distribution[5]).toBe(1);
    expect(s.distribution[4]).toBe(2);
    expect(s.distribution[1]).toBe(0);
  });

  it("is empty for a product with no reviews", async () => {
    const s = await getReviewSummary("nothing-here");
    expect(s.count).toBe(0);
    expect(s.average).toBe(0);
  });
});

describe("moderation", () => {
  it("hiding a review removes it from the public list + summary but not from getAllReviews", async () => {
    const r = await seedReview();
    await setReviewStatus(r.id, "hidden");
    expect(await getReviews(SLUG)).toHaveLength(0);
    expect((await getReviewSummary(SLUG)).count).toBe(0);
    expect(await getAllReviews()).toHaveLength(1); // still visible to admin
  });

  it("re-publishing restores it", async () => {
    const r = await seedReview();
    await setReviewStatus(r.id, "hidden");
    await setReviewStatus(r.id, "published");
    expect(await getReviews(SLUG)).toHaveLength(1);
  });
});

describe("getUserReview + deleteReview", () => {
  it("finds a user's own review and deletes it", async () => {
    const r = await seedReview();
    expect((await getUserReview(SLUG, "u1"))?.id).toBe(r.id);
    expect(await getUserReview(SLUG, "someone-else")).toBeNull();
    expect(await deleteReview(r.id)).toBe(true);
    expect(await getReviews(SLUG)).toHaveLength(0);
    expect(await deleteReview("does-not-exist")).toBe(false);
  });
});
