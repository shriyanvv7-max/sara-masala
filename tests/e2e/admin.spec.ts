import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";

test.describe("Sara Masala admin QA", () => {
  test("admin login page loads", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/admin/login`);

    expect(response?.status()).toBeLessThan(400);

    await expect(
      page.getByRole("heading", { name: /admin sign in/i })
    ).toBeVisible();
  });

  test("protected admin route redirects when signed out", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);

    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin login form validates empty submission", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);

    const signInButton = page.getByRole("button", {
      name: /sign in/i,
    });

    await expect(signInButton).toBeVisible();

    await signInButton.click();

    await expect(
      page.locator('input[type="email"]')
    ).toBeVisible();
  });

  test("admin mobile layout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/admin/login`);

    const overflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(overflow).toBe(false);
  });
});
