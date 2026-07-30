import { expect, test } from "@playwright/test";

import { authFixtures } from "../auth-fixtures";

const storefrontBaseUrl = "http://127.0.0.1:3100";
const adminBaseUrl = "http://127.0.0.1:3101";
const seededAuth = process.env.E2E_SEED_AUTH === "true";

test.describe("seeded local Supabase Auth", () => {
  test.skip(!seededAuth, "Requires E2E_SEED_AUTH=true with migrated local Supabase.");

  test("active customer signs in and reaches their account", async ({ page }) => {
    await page.goto(`${storefrontBaseUrl}/auth/login`);
    await page.getByLabel("Email").fill(authFixtures.customer.email);
    await page.getByLabel("Password").fill(authFixtures.customer.password);
    await page
      .getByRole("button", {
        exact: true,
        name: "Sign in",
      })
      .click();

    await expect(page).toHaveURL(`${storefrontBaseUrl}/account`);
    await expect(
      page.getByRole("heading", {
        name: `Hello, ${authFixtures.customer.fullName}`,
      }),
    ).toBeVisible();
  });

  test("active administrator signs in and reaches the dashboard", async ({ page }) => {
    await page.goto(`${adminBaseUrl}/login`);
    await page.getByLabel("Email").fill(authFixtures.admin.email);
    await page.getByLabel("Password").fill(authFixtures.admin.password);
    await page
      .getByRole("button", {
        exact: true,
        name: "Sign in",
      })
      .click();

    await expect(page).toHaveURL(`${adminBaseUrl}/dashboard`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Dashboard",
      }),
    ).toBeVisible();
  });
});
