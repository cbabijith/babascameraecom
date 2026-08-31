import { randomUUID } from "node:crypto";

import postgres from "postgres";

/**
 * E2E-only accounts on the .invalid domain. Emails carry a per-run suffix so
 * repeated runs never collide with stale rows. Passwords come from the
 * environment when provided; otherwise a random value is generated per run.
 */
const runSuffix = randomUUID().slice(0, 8);

function e2ePassword(environmentVariable: string): string {
  const provided = process.env[environmentVariable]?.trim();
  return provided && provided.length >= 8 ? provided : `Babas-E2E-${randomUUID().slice(0, 12)}`;
}

export const authFixtures = {
  customer: {
    email: `customer.${runSuffix}@babas.e2e.invalid`,
    fullName: "E2E Customer",
    password: e2ePassword("E2E_CUSTOMER_PASSWORD"),
    phone: "+919999999999",
    role: "customer",
  },
  admin: {
    email: `admin.${runSuffix}@babas.e2e.invalid`,
    fullName: "E2E Administrator",
    password: e2ePassword("E2E_ADMIN_PASSWORD"),
    phone: "+919999999998",
    role: "admin",
  },
} as const;

export interface AuthFixture {
  email: string;
  fullName: string;
  password: string;
  phone: string;
  role: string;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for local E2E Auth seeding.`);
  }
  return value;
}

function assertLocalUrl(value: string, label: string): void {
  const hostname = new URL(value).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "[::1]") {
    throw new Error(`Refusing to seed ${label} outside a local database.`);
  }
}

async function signUpViaStorefront(storefrontBaseUrl: string, fixture: AuthFixture): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${storefrontBaseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fixture.email,
        password: fixture.password,
        name: fixture.fullName,
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the storefront auth API at ${storefrontBaseUrl}. Start the dev servers before seeding. (${error instanceof Error ? error.message : error})`,
    );
  }

  // better-auth replies 422 with USER_ALREADY_EXISTS when the row is present.
  // Emails are random per run, so this only happens on intra-run retries.
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
    if (body.error?.code !== "USER_ALREADY_EXISTS") {
      throw new Error(`Sign-up failed for ${fixture.email}: HTTP ${response.status}`);
    }
  }
}

/**
 * Creates both fixtures through the storefront's better-auth API and then
 * shapes their profile/role directly in the database. The storefront dev
 * server must be running; guards refuse non-local databases.
 */
export async function ensureAuthFixtures(
  storefrontBaseUrl = process.env.E2E_STOREFRONT_URL ?? "http://127.0.0.1:3100",
): Promise<void> {
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  assertLocalUrl(databaseUrl, "PostgreSQL");

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    for (const fixture of Object.values(authFixtures)) {
      await signUpViaStorefront(storefrontBaseUrl, fixture);
      const profiles = await sql`
        UPDATE public.users
        SET
          full_name = ${fixture.fullName},
          phone = ${fixture.phone},
          role = ${fixture.role}::public.user_role,
          is_active = true
        WHERE lower(email) = ${fixture.email.toLowerCase()}
        RETURNING email, full_name, role::text, is_active
      `;
      const profile = profiles[0];
      if (
        profile?.full_name !== fixture.fullName ||
        profile.role !== fixture.role ||
        profile.is_active !== true
      ) {
        throw new Error(`Auth profile update failed for ${fixture.email}.`);
      }
    }
    console.log("Seeded and verified local customer/admin auth fixtures.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (import.meta.main) {
  await ensureAuthFixtures();
}
