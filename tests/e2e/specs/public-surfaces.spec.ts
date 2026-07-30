import { expect, test } from "@playwright/test";

const storefrontBaseUrl = "http://127.0.0.1:3100";
const adminBaseUrl = "http://127.0.0.1:3101";

test.describe("public readiness and Auth boundaries", () => {
  test("storefront home is healthy with its database-backed public shell", async ({ page }) => {
    const response = await page.goto(storefrontBaseUrl);

    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("text/html");
    await expect(page).toHaveTitle(/Baba's Camera/i);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /capture every story/i,
      }),
    ).toBeVisible();
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
