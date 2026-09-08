import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";

test.describe("Sara Masala authenticated admin QA", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
    }

    await page.goto(`${BASE_URL}/admin/login`);

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);

    await page
      .getByRole("button", { name: /sign in/i })
      .click();

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("admin dashboard loads", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /good morning|dashboard/i })
    ).toBeVisible();
  });

  test("products page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products`);

    await expect(page).toHaveURL(/\/admin\/products/);

    await expect(
      page.getByRole("heading", { name: /products/i })
    ).toBeVisible();
  });

  test("inventory page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/inventory`);

    await expect(page).toHaveURL(/\/admin\/inventory/);

    await expect(
      page.getByRole("heading", { name: /inventory/i })
    ).toBeVisible();
  });

  test("orders page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);

    await expect(page).toHaveURL(/\/admin\/orders/);

    await expect(
      page.getByRole("heading", { name: /orders/i })
    ).toBeVisible();
  });

  test("mobile admin navigation works", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/admin`);

    const menuButton = page.getByRole("button", {
      name: /menu|navigation/i,
    });

    await expect(menuButton).toBeVisible();

    await menuButton.click();

    await expect(
      page.getByRole("link", { name: /products/i })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /inventory/i })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /orders/i })
    ).toBeVisible();
  });

  test("logout works", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);

    await page
      .getByRole("button", { name: /logout|sign out/i })
      .click();

    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
