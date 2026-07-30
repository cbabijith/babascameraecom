import { defineConfig, devices } from "@playwright/test";

const storefrontPort = 3100;
const adminPort = 3101;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Start local Supabase, apply the Drizzle migration, and export its status values before E2E.`,
    );
  }
  return value;
}

function requiredSupabasePublicKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.",
    );
  }
  return value;
}

const supabasePublicKey = requiredSupabasePublicKey();

const sharedEnvironment = {
  DATABASE_URL: requiredEnvironment("DATABASE_URL"),
  NEXT_PUBLIC_SUPABASE_URL: requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabasePublicKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublicKey,
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${storefrontPort}`,
  NEXT_PUBLIC_STOREFRONT_URL: `http://127.0.0.1:${storefrontPort}`,
  NEXT_PUBLIC_WEB_URL: `http://127.0.0.1:${storefrontPort}`,
  NEXT_PUBLIC_ADMIN_URL: `http://127.0.0.1:${adminPort}`,
  PRODUCT_IMAGES_BUCKET: "product-images",
};

export default defineConfig({
  globalSetup: "./global-setup.ts",
  testDir: "./specs",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: [
    {
      command: `bun --bun next dev --hostname 127.0.0.1 --port ${storefrontPort}`,
      cwd: "../../apps/web",
      env: sharedEnvironment,
      reuseExistingServer: !process.env.CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 180_000,
      url: `http://127.0.0.1:${storefrontPort}`,
    },
    {
      command: `bun --bun next dev --hostname 127.0.0.1 --port ${adminPort}`,
      cwd: "../../apps/admin",
      env: sharedEnvironment,
      reuseExistingServer: !process.env.CI,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 180_000,
      url: `http://127.0.0.1:${adminPort}/api/health`,
    },
  ],
});
