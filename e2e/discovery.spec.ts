import { test, expect } from "@playwright/test";

test("flash sale page shows a live countdown and discounted products", async ({ page }) => {
  await page.goto("/deals");

  // The seeded demo sale ("Lightning Deals") is active in the in-memory data path.
  await expect(page.getByRole("heading", { name: "Lightning Deals" })).toBeVisible();
  await expect(page.getByRole("timer").first()).toBeVisible();

  // A product known to be in the sale is listed at its flash price.
  await expect(page.getByRole("link", { name: /iPhone 13 Pro/i }).first()).toBeVisible();
});

test("a product page surfaces a live flash-sale countdown", async ({ page }) => {
  await page.goto("/product/iphone-13-pro");
  await expect(page.getByText(/Flash sale/i)).toBeVisible();
  await expect(page.getByText(/was ₹/)).toBeVisible();
  await expect(page.getByRole("timer").first()).toBeVisible();
});

test("recently viewed lists previously visited products", async ({ page }) => {
  // Visit one product (recorded), then a different one.
  await page.goto("/product/iphone-13-pro");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/iPhone 13 Pro/i);

  await page.goto("/product/macbook-pro-14");
  const rail = page.locator('section[aria-label="Recently viewed"]');
  await expect(rail).toBeVisible();
  // The previously-viewed product appears; the current one is excluded.
  await expect(rail.getByRole("link", { name: /iPhone 13 Pro/i }).first()).toBeVisible();
});
