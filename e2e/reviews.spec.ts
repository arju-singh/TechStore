import { test, expect } from "@playwright/test";

test("a signed-in shopper can write a review that appears on the product", async ({ page }) => {
  // Unique per run: with reuseExistingServer the in-memory store persists across
  // runs, so both the account AND the review text must be unique or they collide.
  const stamp = Date.now();
  const email = `e2e_review_${stamp}@example.com`;
  const title = `Solid ultrabook ${stamp}`;
  const body = `Great keyboard and a crisp display that lasts all day. [${stamp}]`;

  // Sign up (fresh session).
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Reviewer E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Testpass123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/);
  // Let the post-signup client transition (router.push + router.refresh) settle
  // before navigating away, so the next goto doesn't race the pending RSC render.
  await expect(page.getByRole("button", { name: /Hello, Reviewer/i })).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Open a product and wait for it to fully load before interacting.
  await page.goto("/product/dell-xps-13", { waitUntil: "networkidle" });
  const reviews = page.locator("#reviews");
  await expect(reviews.getByRole("heading", { name: /Ratings & reviews/i })).toBeVisible();

  // The write form should be available (this user hasn't reviewed this product).
  const postButton = reviews.getByRole("button", { name: "Post review" });
  await expect(postButton).toHaveCount(1);

  // Fill the text fields first (no layout churn), then set the rating last —
  // clicking a star re-renders the picker, so doing it after the fills avoids
  // racing an input against that re-render.
  await reviews.getByLabel("Review headline").fill(title);
  await reviews.getByLabel("Your review").fill(body);
  await reviews.getByRole("button", { name: "4 stars" }).click();
  await expect(reviews.getByText("4/5")).toBeVisible(); // rating registered
  await postButton.click();

  // This run's review appears (unique text → matches exactly one), and the form
  // is replaced by the owner's delete control.
  await expect(reviews.getByText(title)).toBeVisible();
  await expect(reviews.getByText(`[${stamp}]`)).toBeVisible();
  await expect(reviews.getByRole("button", { name: /Delete my review/i })).toBeVisible();
  // The write form is no longer offered to this (now-reviewed) user.
  await expect(reviews.getByText("Write a review")).toHaveCount(0);
});
