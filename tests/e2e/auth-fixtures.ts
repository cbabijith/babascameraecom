import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

/**
 * E2E-only accounts on the .invalid domain. Passwords come from the
 * environment when provided; otherwise a random value is generated per run
 * (the seeding helper signs in with these values, so any value works).
 */
function e2ePassword(environmentVariable: string): string {
  const provided = process.env[environmentVariable]?.trim();
  return provided && provided.length >= 8 ? provided : `Babas-E2E-${randomUUID().slice(0, 12)}`;
}

export const authFixtures = {
  customer: {
    email: "customer.e2e@babas.invalid",
    fullName: "E2E Customer",
    password: e2ePassword("E2E_CUSTOMER_PASSWORD"),
    phone: "+919999999999",
    role: "customer",
  },
  admin: {
    email: "admin.e2e@babas.invalid",
    fullName: "E2E Administrator",
    password: e2ePassword("E2E_ADMIN_PASSWORD"),
    phone: "+919999999998",
    role: "admin",
  },
} as const;

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
    throw new Error(`Refusing to seed ${label} outside local Supabase.`);
  }
}

export async function seedLocalAuthFixtures(): Promise<void> {
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = requiredEnvironment("DATABASE_URL");

  assertLocalUrl(supabaseUrl, "Auth API");
  assertLocalUrl(databaseUrl, "PostgreSQL");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
  });

  try {
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1_000,
    });
    if (listError) {
      throw listError;
    }

    for (const fixture of Object.values(authFixtures)) {
      const existing = listed.users.find((candidate) => candidate.email === fixture.email);
      if (existing) {
        const { error } = await supabase.auth.admin.deleteUser(existing.id);
        if (error) {
          throw error;
        }
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: fixture.email,
        password: fixture.password,
        email_confirm: true,
        user_metadata: {
          full_name: fixture.fullName,
        },
      });
      if (error || !data.user) {
        throw error ?? new Error(`Unable to create ${fixture.email}.`);
      }

      const profiles = await sql`
        UPDATE public.users
        SET
          full_name = ${fixture.fullName},
          phone = ${fixture.phone},
          role = ${fixture.role}::public.user_role,
          is_active = true
        WHERE id = ${data.user.id}::uuid
        RETURNING
          email,
          full_name,
          role::text,
          is_active
      `;
      const profile = profiles[0];
      if (
        profile?.email !== fixture.email ||
        profile.full_name !== fixture.fullName ||
        profile.role !== fixture.role ||
        profile.is_active !== true
      ) {
        throw new Error(`Auth profile trigger verification failed for ${fixture.email}.`);
      }
    }

    console.log("Seeded and verified local customer/admin Auth fixtures.");
  } finally {
    await sql.end({
      timeout: 5,
    });
  }
}

if (import.meta.main) {
  await seedLocalAuthFixtures();
}
