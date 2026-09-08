import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";

test.describe("Sara Masala storefront QA", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", msg => {
      if (msg.type() === "error") {
        console.log("BROWSER ERROR:", msg.text());
      }
    });

    page.on("response", async response => {
      if (response.status() >= 400) {
        console.log(
          "HTTP ERROR:",
          response.status(),
          response.url()
        );
      }
    });
  });

  test("homepage loads and main CTAs work", async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page).toHaveTitle(/Sara/i);

    await page
      .getByRole("link", { name: /shop the collection/i })
      .click();

    await expect(page).toHaveURL(/\/shop/);

    await page.goto(BASE_URL);

    await page
      .getByRole("link", { name: /explore recipes/i })
      .click();

    await expect(page).toHaveURL(/\/recipes/);
  });

  test("shop loads products", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await expect(
      page.getByText("THE SARA PANTRY", { exact: true })
    ).toBeVisible();

    const productCards = page.locator(".store-product");

    await expect(productCards.first()).toBeVisible();

    const count = await productCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test("shop search works", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const search = page.getByPlaceholder(/search the pantry/i);

    await search.fill("Turmeric");

    await expect(
      page.getByRole("heading", {
        name: "Turmeric Powder",
        exact: true,
      })
    ).toBeVisible();
  });

  test("weight filter updates displayed variant", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const selects = page.locator(".shop-tools select");

    // Second select is the weight filter
    const weightSelect = selects.nth(1);

    await weightSelect.selectOption({ label: "250g" });

    const firstProductCard = page.locator(".store-product").first();

    await expect(
      firstProductCard
        .locator(".product-copy div span")
        .filter({ hasText: "250g" })
    ).toBeVisible();
  });

  test("product page opens", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const firstProduct = page.locator(".store-product").first();

    await firstProduct.locator("a").first().click();

    await expect(page).toHaveURL(/\/product\//);

    await expect(
      page.locator(".detail h1")
    ).toBeVisible();
  });

  test("add to cart works", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const quickAdd = page
      .getByRole("button", { name: /quick add/i })
      .first();

    await quickAdd.click();

    await page.goto(`${BASE_URL}/cart`);

    await expect(
      page.getByRole("heading", { name: /your cart/i })
    ).toBeVisible();

    await expect(
      page.locator(".cart-row").first()
    ).toBeVisible();
  });

  test("buy now goes to checkout", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    const firstProduct = page.locator(".store-product").first();

    await firstProduct.locator("a").first().click();

    const buyNow = page.getByRole("button", {
      name: /buy now/i,
    });

    await expect(buyNow).toBeVisible();

    await buyNow.click();

    await expect(page).toHaveURL(/\/checkout/);
  });

  test("checkout validates customer details", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);

    await page
      .getByRole("button", { name: /quick add/i })
      .first()
      .click();

    await page.goto(`${BASE_URL}/checkout`);

    const continueButton = page.getByRole("button", {
      name: /continue to payment/i,
    });

    await expect(continueButton).toBeVisible();

    await continueButton.click();

    const validationMessage = page.locator('[role="alert"]').first();

    await expect(validationMessage).toBeVisible();
  });

  test("no obvious broken public routes", async ({ page }) => {
    const routes = [
      "/",
      "/shop",
      "/recipes",
      "/about",
      "/contact",
      "/cart",
      "/checkout",
    ];

    for (const route of routes) {
      const response = await page.goto(`${BASE_URL}${route}`);

      expect(response).not.toBeNull();

      expect(response?.status()).toBeLessThan(400);
    }
  });
});
