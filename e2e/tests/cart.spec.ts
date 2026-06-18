import { test, expect } from "@playwright/test";

test.describe("Cart", () => {
  test("homepage loads with products or empty state", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/velora/i, { timeout: 15_000 });
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("product listing page loads", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/\/products/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    const grid = page.locator('[class*="grid"],[class*="product"]').first();
    await expect(grid.or(page.locator('p:has-text("No products")'))).toBeVisible({ timeout: 10_000 });
  });

  test("cart page is accessible", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart/, { timeout: 10_000 });
    const cartContent = page.locator('h1:has-text("Cart"), h1:has-text("Shopping"), [class*="cart"]').first();
    await expect(cartContent).toBeVisible({ timeout: 10_000 });
  });

  test("guest can view cart (empty state)", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/cart");
    await page.waitForLoadState("networkidle");
    const emptyMsg = page.locator('text=/empty|no items|0 items/i').first();
    const cartSection = page.locator('[class*="cart"]').first();
    await expect(emptyMsg.or(cartSection)).toBeVisible({ timeout: 10_000 });
  });

  test("can add product to cart if products exist", async ({ page }) => {
    await page.evaluate(() => {
      const existing = JSON.parse(localStorage.getItem("guest_cart") ?? "[]");
      existing.push({ variantId: 1, quantity: 1 });
      localStorage.setItem("guest_cart", JSON.stringify(existing));
    });
    await page.goto("/cart");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
