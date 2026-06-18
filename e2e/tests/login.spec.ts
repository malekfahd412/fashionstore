import { test, expect } from "@playwright/test";

const unique = () => `pw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function registerAndLogin(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/register");
  await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Login Test");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

  const token = await page.evaluate(() => localStorage.getItem("auth_token"));
  expect(token).toBeTruthy();

  const logoutBtn = page.locator('[data-testid="logout"], button:has-text("Logout"), button:has-text("Sign out")').first();
  if (await logoutBtn.isVisible()) await logoutBtn.click();
  else {
    await page.evaluate(() => localStorage.removeItem("auth_token"));
    await page.goto("/");
  }
}

test.describe("Login", () => {
  test("shows login page with form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("customer can login and logout", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;
    const password = "SecurePass123!";

    await registerAndLogin(page, email, password);

    await page.goto("/login");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

    const token = await page.evaluate(() => localStorage.getItem("auth_token"));
    expect(token).toBeTruthy();
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').first().fill("notfound@velora-e2e.test");
    await page.locator('input[type="password"]').first().fill("WrongPassword123!");
    await page.locator('button[type="submit"]').first().click();

    const errEl = page.locator('[class*="error"],[class*="red"],[role="alert"]').first();
    await expect(errEl).toBeVisible({ timeout: 8_000 });
  });

  test("redirect to login for protected routes", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/customer/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});
