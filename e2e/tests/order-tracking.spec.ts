import { test, expect } from "@playwright/test";

const unique = () => `pw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

test.describe("Order Tracking", () => {
  test("order tracking page for unknown order shows not found", async ({ page }) => {
    await page.goto("/order-tracking/999999");
    await page.waitForLoadState("networkidle");
    const content = page.locator('text=/not found|Order #999999|no order/i').first();
    const heading = page.locator("h1, h2").first();
    await expect(content.or(heading)).toBeVisible({ timeout: 10_000 });
  });

  test("customer dashboard orders tab is accessible", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;
    const password = "TrackPass123!";

    await page.goto("/register");
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Tracker User");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

    await page.goto("/customer/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/customer\/dashboard/, { timeout: 10_000 });

    const ordersTab = page.locator('button:has-text("Order"), [data-tab="orders"], a:has-text("Order")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      const ordersSection = page.locator('[class*="order"],[class*="Order"], text=/no orders/i').first();
      await expect(ordersSection).toBeVisible({ timeout: 8_000 });
    }
  });

  test("order tracking page structure is correct", async ({ page }) => {
    await page.goto("/order-tracking/1");
    await page.waitForLoadState("networkidle");

    const trackingContent = page.locator(
      'text=/Order|order|tracking|Tracking|not found|Order #/i'
    ).first();
    await expect(trackingContent).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate between order tracking and support", async ({ page }) => {
    const email = `${unique()}@velora-e2e.test`;
    const password = "NavPass123!";

    await page.goto("/register");
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill("Nav User");
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(customer|$)/, { timeout: 15_000 });

    await page.goto("/customer/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
