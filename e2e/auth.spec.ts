import { test, expect } from "@playwright/test";

// The auth forms briefly render twice during client hydration (the SSR node and
// the hydrated node momentarily coexist with different attribute order), so a
// getByLabel().fill() can strict-mode-fail on 2 matches. Because fill() re-
// resolves the locator at action time, a one-shot count check still races it —
// so we retry the whole fill sequence with expect(...).toPass(), which only
// settles once the DOM has permanently collapsed to a single set of fields.
async function fillStable(fn: () => Promise<void>) {
  await expect(fn).toPass({ timeout: 10_000 });
}

test("a shopper can sign up and land on their account", async ({ page }) => {
  // Unique email per run so repeated runs don't collide.
  const email = `e2e_signup_${Date.now()}@example.com`;

  await page.goto("/signup");
  await fillStable(async () => {
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Testpass123!");
  });
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/account/);
  // The signup form is gone → we're authenticated.
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
});

test("bad credentials on login show an error and stay on the page", async ({ page }) => {
  await page.goto("/login");
  await fillStable(async () => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
  });
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
