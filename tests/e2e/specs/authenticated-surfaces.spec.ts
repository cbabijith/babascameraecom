import { expect, test } from "@playwright/test";

import { authFixtures, ensureAuthFixtures } from "../auth-fixtures";

const storefrontBaseUrl = "http://127.0.0.1:3100";
const adminBaseUrl = "http://127.0.0.1:3101";
const seededAuth = process.env.E2E_SEED_AUTH === "true";

test.describe("seeded local better-auth", () => {
  test.skip(!seededAuth, "Requires E2E_SEED_AUTH=true with a migrated local database.");

  test.beforeAll(async () => {
    // The Playwright dev servers are up before tests start, so the storefront
    // auth API is reachable for fixture creation.
    await ensureAuthFixtures(storefrontBaseUrl);
  });

  test("active customer signs in and reaches the storefront", async ({ page }) => {
    await page.goto(`${storefrontBaseUrl}/login`);
    await page.getByLabel("Email", { exact: false }).fill(authFixtures.customer.email);
    await page.getByLabel("Password", { exact: true }).fill(authFixtures.customer.password);
    await page.getByRole("button", { exact: true, name: "Login" }).click();

    await expect(page).toHaveURL(`${storefrontBaseUrl}/`);
  });

  test("active administrator signs in and reaches the dashboard", async ({ page }) => {
    await page.goto(`${adminBaseUrl}/login`);
    await page.getByLabel("Email", { exact: true }).fill(authFixtures.admin.email);
    await page.getByLabel("Password", { exact: true }).fill(authFixtures.admin.password);
    await page.getByRole("button", { name: "Sign in securely" }).click();

    await expect(page).toHaveURL(`${adminBaseUrl}/dashboard`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Dashboard",
      }),
    ).toBeVisible();
  });
});
