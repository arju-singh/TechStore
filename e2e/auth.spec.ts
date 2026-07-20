import { test, expect } from "@playwright/test";

test("a shopper can sign up and land on their account", async ({ page }) => {
  // Unique email per run so repeated runs don't collide.
  const email = `e2e_signup_${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Testpass123!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/account/);
  // The signup form is gone → we're authenticated.
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
});

test("bad credentials on login show an error and stay on the page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrongpassword");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
