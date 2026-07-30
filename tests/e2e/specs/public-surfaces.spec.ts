import { expect, test } from "@playwright/test";

const storefrontBaseUrl = "http://127.0.0.1:3100";
const adminBaseUrl = "http://127.0.0.1:3101";

test.describe("public readiness and Auth boundaries", () => {
  test("storefront home and aggregate public API are healthy", async ({ page, request }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const response = await page.goto(storefrontBaseUrl);

    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("text/html");
    await expect(page).toHaveTitle(/Baba's Camera/i);
    await expect(page.getByRole("link", { name: "Baba's Camera home" })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    expect(consoleErrors.filter((message) => /hydration|uncaught/i.test(message))).toEqual([]);

    const apiResponse = await request.get(
      `${storefrontBaseUrl}/api/storefront/home?sectionLimit=8`,
    );
    expect(apiResponse.status()).toBe(200);
    expect(apiResponse.headers()["cache-control"]).toContain("s-maxage=60");
    const payload = await apiResponse.json();
    expect(payload.success).toBe(true);
    expect(payload.meta.currency).toBe("INR");
    expect(JSON.stringify(payload)).not.toMatch(
      /costPrice|supplier|internalName|serviceRole|inventoryHistory/i,
    );

    const nextBanner = page.getByRole("button", { name: "Next banner" });
    if (await nextBanner.count()) {
      await nextBanner.click();
    }

    for (const selector of [
      'a[href^="/categories/"]',
      'a[href^="/products/"]',
      'a[href^="/brands/"]',
    ]) {
      const link = page.locator(selector).first();
      if (await link.count()) {
        const href = await link.getAttribute("href");
        expect(href).toMatch(/^\/(?:categories|products|brands)\/[a-z0-9-]+$/);
      }
    }
  });

  test("storefront sign-in and registration surfaces render", async ({ page }) => {
    await page.goto(`${storefrontBaseUrl}/auth/login`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Welcome back",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto(`${storefrontBaseUrl}/auth/register`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Create your account",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
  });

  test("anonymous storefront account access preserves a safe return path", async ({ page }) => {
    await page.goto(`${storefrontBaseUrl}/account`);

    await expect(page).toHaveURL(`${storefrontBaseUrl}/auth/login?next=%2Faccount`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Welcome back",
      }),
    ).toBeVisible();
  });

  test("admin health route is public and reports its service contract", async ({ request }) => {
    const response = await request.get(`${adminBaseUrl}/api/health`);

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "admin",
      status: "ok",
    });
  });

  test("anonymous admin dashboard access redirects to sign-in", async ({ page }) => {
    await page.goto(`${adminBaseUrl}/dashboard`);

    await expect(page).toHaveURL(`${adminBaseUrl}/login?next=%2Fdashboard`);
    await expect(page.getByText("Baba's Camera Admin", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
