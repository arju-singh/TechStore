import { test, expect } from "@playwright/test";

test("add a product to the cart from its page", async ({ page }) => {
  await page.goto("/product/macbook-pro-14");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/MacBook/i);

  await page.getByRole("button", { name: "Add to Cart" }).click();
  // Button confirms the add.
  await expect(page.getByRole("button", { name: /Added to cart/i })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /Your cart/i })).toBeVisible();
  await expect(page.getByText("Order summary")).toBeVisible();
  await expect(page.getByRole("link", { name: "Proceed to checkout" })).toBeVisible();
  // The item we added is listed.
  await expect(page.getByRole("link", { name: /MacBook/i }).first()).toBeVisible();
});

test("buy-now takes you straight to a populated cart", async ({ page }) => {
  await page.goto("/product/dell-xps-13");
  await page.getByRole("button", { name: "Buy Now" }).click();

  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByRole("heading", { name: /Your cart/i })).toBeVisible();
  await expect(page.getByText(/Total/).first()).toBeVisible();
});
