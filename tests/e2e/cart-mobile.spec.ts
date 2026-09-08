import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";

test.describe("Sara Masala cart and mobile QA", () => {

  test.beforeEach(async ({ page }) => {
    page.on("console", msg => {
      if (msg.type() === "error") {
        console.log("BROWSER ERROR:", msg.text());
      }
    });

    page.on("response", response => {
      if (response.status() >= 400) {
        console.log(
          "HTTP ERROR:",
          response.status(),
          response.url()
        );
      }
    });
  });

  test("cart persists after page refresh", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/cart`);

    await expect(page.locator(".cart-row").first()).toBeVisible();

    await page.reload();

    await expect(page.locator(".cart-row").first()).toBeVisible();
  });

  test("cart quantity can be increased", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/cart`);

    const cartRow = page.locator(".cart-row").first();

    await expect(cartRow).toBeVisible();

    const increaseButton = cartRow
      .getByRole("button", { name: /\+|increase/i })
      .first();

    await increaseButton.click();

    await expect(cartRow).toContainText("2");
  });

  test("cart item can be removed", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/cart`);

    const cartRow = page.locator(".cart-row").first();

    await expect(cartRow).toBeVisible();

    await cartRow
      .getByRole("button", { name: /remove/i })
      .click();

    await expect(cartRow).toHaveCount(0);
  });

  test("multiple products can exist in cart", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const quickAdd = page.getByRole("button", {
      name: /quick add/i,
    });

    const count = await quickAdd.count();

    expect(count).toBeGreaterThanOrEqual(2);

    await quickAdd.nth(0).click();
    await quickAdd.nth(1).click();

    await page.goto(`${BASE_URL}/cart`);

    expect(await page.locator(".cart-row").count()).toBeGreaterThanOrEqual(2);
  });

  test("checkout keeps cart after refresh", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/checkout`);

    await expect(
      page.getByRole("button", {
        name: /continue to payment/i,
      })
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("button", {
        name: /continue to payment/i,
      })
    ).toBeVisible();
  });

  test("mobile homepage has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(BASE_URL);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        document.documentElement.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test("mobile shop has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/shop`);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        document.documentElement.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test("mobile product page has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/shop`);

    await page
      .locator(".store-product")
      .first()
      .locator("a")
      .first()
      .click();

    await expect(page).toHaveURL(/\/product\//);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        document.documentElement.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test("mobile cart has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/cart`);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        document.documentElement.clientWidth;
    });

    expect(overflow).toBe(false);
  });

  test("mobile checkout has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/checkout`);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth >
        document.documentElement.clientWidth;
    });

    expect(overflow).toBe(false);

    await expect(
      page.getByRole("button", {
        name: /continue to payment/i,
      })
    ).toBeVisible();
  });

});
