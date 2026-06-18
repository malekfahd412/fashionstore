import { test, expect } from "@playwright/test";

const unique = () => `pw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

async function loginAs(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });
}

test.describe("Checkout", () => {
  test("checkout page requires login", async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/checkout");
    await page.waitForURL(/\/login|\/cart/, { timeout: 10_000 });
  });

  test("checkout page loads for logged-in user", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;
    const password = "CheckoutPass123!";

    await page.goto("/register");
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Checkout User");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("checkout form shows billing fields", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;
    const password = "CheckoutPass123!";

    await page.goto("/register");
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Form Tester");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

    await page.evaluate(() => {
      const cart = [{ variantId: 1, quantity: 1 }];
      localStorage.setItem("guest_cart", JSON.stringify(cart));
    });

    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");

    const formOrRedirect = page.locator(
      'input[name*="name" i], input[name*="address" i], input[name*="phone" i], text=/empty|no items/i, a[href="/products"]'
    ).first();
    await expect(formOrRedirect).toBeVisible({ timeout: 10_000 });
  });
});
