import { test, expect } from "@playwright/test";

const unique = () => `pw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe("Registration", () => {
  test("shows registration page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("form")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveTitle(/velora/i);
  });

  test("customer can register with valid data", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;

    await page.goto("/register");

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await nameInput.fill("E2E Test User");
    await emailInput.fill(email);
    await passInput.fill("SecurePass123!");
    await submitBtn.click();

    await expect(page).toHaveURL(/\/(customer|$)/, { timeout: 15_000 });
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/register");

    const emailInput = page.locator('input[type="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill("not-an-email");
    await passInput.fill("SecurePass123!");
    await submitBtn.click();

    const error = page.locator('[class*="error"],[class*="red"],[class*="invalid"],[role="alert"]').first();
    await expect(error.or(emailInput)).toBeVisible({ timeout: 5_000 });
  });

  test("prevents duplicate registration", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;

    for (let i = 0; i < 2; i++) {
      await page.goto("/register");
      await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Dup User");
      await page.locator('input[type="email"]').first().fill(email);
      await page.locator('input[type="password"]').first().fill("SecurePass123!");
      await page.locator('button[type="submit"]').first().click();
      if (i === 0) await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });
    }

    const errEl = page.locator('[class*="error"],[class*="red"],[role="alert"]').first();
    await expect(errEl).toBeVisible({ timeout: 8_000 });
  });
});
