import { expect, Page, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";
const E2E_PRODUCT = {
  name: "E2E Mutable Product",
  slug: "e2e-mutable-product",
  sku: "E2E-MUTABLE-125G",
};

async function login(page: Page) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
  await page.goto(`${BASE_URL}/admin/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

function fixtureRow(page: Page) {
  return page.locator(".admin-table article").filter({ hasText: E2E_PRODUCT.name });
}

async function ensureE2EProduct(page: Page) {
  await page.goto(`${BASE_URL}/admin/products?filter=all`);
  const existing = fixtureRow(page);
  if (await existing.count()) {
    await existing.getByRole("link", { name: /edit/i }).click();
    const restore = page.getByRole("button", { name: /restore product/i });
    if (await restore.isVisible().catch(() => false)) {
      page.once("dialog", dialog => dialog.accept());
      await restore.click();
      await expect(page.getByText(/product restored/i)).toBeVisible();
      const active = page.getByRole("checkbox", { name: /^active$/i }).first();
      await expect(active).toBeEnabled();
      if (!await active.isChecked()) await active.check();
      await page.getByRole("button", { name: /save changes/i }).click();
      await expect(page).toHaveURL(/\/admin\/products$/);
    }
    return;
  }

  await page.goto(`${BASE_URL}/admin/products/new`);
  await page.locator('input[name="product.name"]').fill(E2E_PRODUCT.name);
  await page.locator('input[name="product.slug"]').fill(E2E_PRODUCT.slug);
  await page.locator('textarea[name="product.description"]').fill("Isolated automated regression fixture for safe admin write testing.");
  await page.locator('textarea[name="product.ingredients"]').fill("Test spices only.");
  await page.locator('input[name="variants.0.weight"]').fill("125g");
  await page.locator('input[name="variants.0.price"]').fill("90");
  await page.locator('input[name="variants.0.mrp"]').fill("100");
  await page.locator('input[name="variants.0.stock"]').fill("20");
  await page.locator('input[name="variants.0.sku"]').fill(E2E_PRODUCT.sku);
  const createResponse = page.waitForResponse(response => response.url().endsWith("/api/products") && response.request().method() === "POST");
  await page.getByRole("button", { name: /save changes/i }).click();
  expect((await createResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/\/admin\/products$/);
}

async function openE2EProduct(page: Page) {
  await page.goto(`${BASE_URL}/admin/products`);
  const row = fixtureRow(page);
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: /edit/i }).click();
  await expect(page).toHaveURL(/\/admin\/products\/.+/);
}

async function cleanupE2EProduct(page: Page) {
  await page.goto(`${BASE_URL}/admin/products?filter=all`);
  const row = fixtureRow(page);
  if (!await row.count()) return;
  await row.getByRole("link", { name: /edit/i }).click();
  const remove = page.getByRole("button", { name: /^delete product$/i });
  const archive = page.getByRole("button", { name: /^archive product$/i });
  if (await remove.isVisible().catch(() => false)) {
    page.once("dialog", dialog => dialog.accept());
    await remove.click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  } else if (await archive.isVisible().catch(() => false)) {
    page.once("dialog", dialog => dialog.accept());
    await archive.click();
    await expect(page).toHaveURL(/filter=archived/);
  }
}

test.describe("Sara Masala admin write QA", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page);
    await ensureE2EProduct(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page);
      await cleanupE2EProduct(page);
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => login(page));

  test("dedicated E2E product can be opened for editing", async ({ page }) => {
    await openE2EProduct(page);
    await expect(page.locator('input[name="product.name"]')).toHaveValue(E2E_PRODUCT.name);
  });

  test("dedicated E2E product price can be changed and restored", async ({ page }) => {
    await openE2EProduct(page);
    const price = page.locator('input[name="variants.0.price"]');
    const mrp = page.locator('input[name="variants.0.mrp"]');
    const originalPrice = await price.inputValue();
    const originalMrp = await mrp.inputValue();
    const temporaryPrice = Number(originalPrice) + 1 <= Number(originalMrp) ? Number(originalPrice) + 1 : Math.max(1, Number(originalPrice) - 1);
    await price.fill(String(temporaryPrice));
    const update = page.waitForResponse(response => /\/api\/product-variants\/[0-9a-f-]+$/i.test(response.url()) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: /save changes/i }).click();
    expect((await update).ok()).toBe(true);
    await expect(page).toHaveURL(/\/admin\/products$/);

    await openE2EProduct(page);
    await expect(page.locator('input[name="variants.0.price"]')).toHaveValue(String(temporaryPrice));
    await page.locator('input[name="variants.0.price"]').fill(originalPrice);
    await page.locator('input[name="variants.0.mrp"]').fill(originalMrp);
    const restore = page.waitForResponse(response => /\/api\/product-variants\/[0-9a-f-]+$/i.test(response.url()) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: /save changes/i }).click();
    expect((await restore).ok()).toBe(true);
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test("dedicated E2E product stock can be changed and restored", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/inventory`);
    let row = page.locator(".inventory-table article").filter({ hasText: E2E_PRODUCT.name });
    await expect(row).toBeVisible();
    const originalStock = await row.getByLabel("Stock").inputValue();
    const temporaryStock = originalStock === "9" ? "8" : "9";
    await row.getByLabel("Stock").fill(temporaryStock);
    const update = page.waitForResponse(response => /\/api\/product-variants\/[0-9a-f-]+$/i.test(response.url()) && response.request().method() === "PATCH");
    await row.getByRole("button", { name: /^save$/i }).click();
    expect((await update).ok()).toBe(true);
    await expect(page.getByText("Variant saved.")).toBeVisible();
    await page.reload();
    row = page.locator(".inventory-table article").filter({ hasText: E2E_PRODUCT.name });
    await expect(row.getByLabel("Stock")).toHaveValue(temporaryStock);

    await row.getByLabel("Stock").fill(originalStock);
    const restore = page.waitForResponse(response => /\/api\/product-variants\/[0-9a-f-]+$/i.test(response.url()) && response.request().method() === "PATCH");
    await row.getByRole("button", { name: /^save$/i }).click();
    expect((await restore).ok()).toBe(true);
    await page.reload();
    row = page.locator(".inventory-table article").filter({ hasText: E2E_PRODUCT.name });
    await expect(row.getByLabel("Stock")).toHaveValue(originalStock);
  });

  test("active E2E product appears on the storefront", async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);
    const search = page.getByPlaceholder(/search the pantry/i);
    await search.fill(E2E_PRODUCT.name);
    await expect(page.getByRole("heading", { name: E2E_PRODUCT.name, exact: true })).toBeVisible();
  });

  test("signed-out user cannot access admin write pages", async ({ browser }) => {
    const context = await browser.newContext();
    const signedOutPage = await context.newPage();
    await signedOutPage.goto(`${BASE_URL}/admin/products`);
    await expect(signedOutPage).toHaveURL(/\/admin\/login/);
    await context.close();
  });
});
