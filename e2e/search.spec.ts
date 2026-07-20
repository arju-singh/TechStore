import { test, expect } from "@playwright/test";

test("instant search suggests products and navigates to one", async ({ page }) => {
  await page.goto("/");

  const search = page.getByRole("combobox", { name: "Search products" });
  await search.click();
  await search.fill("mac");

  const listbox = page.getByRole("listbox", { name: "Search suggestions" });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByText("Products")).toBeVisible();

  // Pick the MacBook product suggestion from the dropdown.
  const option = listbox.getByRole("option").filter({ hasText: /MacBook/i }).first();
  await option.click();

  await expect(page).toHaveURL(/\/product\/macbook-pro-14/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/MacBook/i);
});

test("empty search shows trending terms", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Search products" }).click();

  const listbox = page.getByRole("listbox", { name: "Search suggestions" });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByText("Trending")).toBeVisible();
});
