import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://sara-masala.vercel.app";

async function login(page: Page) {
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
}

async function openEligiblePaidOrder(page: Page) {
  await page.goto(`${BASE_URL}/admin/orders?filter=paid`);
  const eligible = page.locator(".admin-table article").filter({ hasText: /Paid · (confirmed|packed|shipped|out_for_delivery|delivered)/i });
  const hrefs = await eligible.getByRole("link").evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  for (const href of hrefs) {
    await page.goto(href);
    const status = page.getByLabel("Order status");
    if (await status.isEnabled().catch(() => false) && /QA Test Product|E2E Mutable Product/i.test(await page.locator("body").innerText())) return true;
  }
  return false;
}

test.describe("Sara Masala order management QA", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("orders page shows at least one order", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);

    await expect(
      page.getByRole("heading", { name: /orders/i })
    ).toBeVisible();

    const orderLinks = page.locator('a[href*="/admin/orders/"]');

    expect(await orderLinks.count()).toBeGreaterThan(0);
  });

  test("latest order can be opened", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);

    const firstOrder = page.locator('a[href*="/admin/orders/"]').first();

    await expect(firstOrder).toBeVisible();

    await firstOrder.click();

    await expect(page).toHaveURL(/\/admin\/orders\/.+/);
  });

  test("latest order shows payment information", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);

    const firstOrder = page.locator('a[href*="/admin/orders/"]').first();

    await firstOrder.click();

    await expect(
      page.getByText(/paid|captured/i).first()
    ).toBeVisible();
  });

  test("latest order shows customer and item details", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/orders`);

    const firstOrder = page.locator('a[href*="/admin/orders/"]').first();

    await firstOrder.click();

    await expect(page.locator("body")).toContainText(/QA Test Product|customer|address/i);
  });

 test("fulfilment status can be changed and restored", async ({ page }) => {
  const eligible = await openEligiblePaidOrder(page);
  test.skip(!eligible, "No paid, fulfilment-eligible QA/E2E order is available; no customer order was mutated.");

  const statusSelect = page.getByLabel("Order status");
  await expect(statusSelect).toBeEnabled();

  const originalStatus = await statusSelect.inputValue();

  const temporaryStatus =
    originalStatus === "packed"
      ? "confirmed"
      : "packed";

  await statusSelect.selectOption(temporaryStatus);

  // Wait specifically for the PATCH request to finish.
  const updateResponsePromise = page.waitForResponse(
    response =>
      response.url().includes("/api/admin/orders/") &&
      response.request().method() === "PATCH"
  );

  await page
    .getByRole("button", {
      name: /save fulfilment status/i,
    })
    .click();

  const updateResponse = await updateResponsePromise;

  expect(updateResponse.ok()).toBe(true);

  await expect(page.getByRole("status").filter({ hasText: /order status saved/i })).toBeVisible();

  // Now it is safe to reload.
  await page.reload();

  const refreshedSelect = page.getByLabel("Order status");

  await expect(refreshedSelect).toHaveValue(
    temporaryStatus
  );

  // Restore original status.
  await refreshedSelect.selectOption(originalStatus);

  const restoreResponsePromise = page.waitForResponse(
    response =>
      response.url().includes("/api/admin/orders/") &&
      response.request().method() === "PATCH"
  );

  await page
    .getByRole("button", {
      name: /save fulfilment status/i,
    })
    .click();

  const restoreResponse = await restoreResponsePromise;

  expect(restoreResponse.ok()).toBe(true);

  await expect(page.getByRole("status").filter({ hasText: /order status saved/i })).toBeVisible();

  await page.reload();

  const restoredSelect = page.getByLabel("Order status");

  await expect(restoredSelect).toHaveValue(
    originalStatus
  );
});
  test("mobile order page has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.goto(`${BASE_URL}/admin/orders`);

    const firstOrder = page.locator('a[href*="/admin/orders/"]').first();

    await firstOrder.click();
    await expect(page).toHaveURL(/\/admin\/orders\/.+/);

    const overflowing = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>("body *")]
        .filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.right > viewportWidth + 1 || rect.left < -1;
        })
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          className: element.className,
          text: (element.textContent || "").trim().slice(0, 100),
          right: Math.round(element.getBoundingClientRect().right),
        }))
        .slice(0, 10);
    });

    expect(overflowing, `Overflowing elements: ${JSON.stringify(overflowing)}`).toEqual([]);
  });

  test("signed-out user cannot open order details", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/admin/orders`);

    await expect(page).toHaveURL(/\/admin\/login/);

    await context.close();
  });
});
