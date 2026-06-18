export const TEST_USER = {
  name: "Test Playwright User",
  email: `playwright_${Date.now()}@velora-test.local`,
  password: "TestPass123!",
};

export const ADMIN_USER = {
  email: process.env.ADMIN_EMAIL ?? "admin@velora.test",
  password: process.env.ADMIN_PASSWORD ?? "AdminPass123!",
};
