import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDatabase } from "./client";
import * as schema from "./schema";

export function createBetterAuth(options?: { baseURL?: string; secret?: string }) {
  const db = getDatabase();
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
      },
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    baseURL:
      options?.baseURL ||
      process.env.NEXT_PUBLIC_ADMIN_URL ||
      process.env.BETTER_AUTH_URL ||
      "http://localhost:3001",
    secret:
      options?.secret ||
      process.env.BETTER_AUTH_SECRET ||
      "babas-camera-super-secret-auth-key-2026-very-secure-32chars",
  });
}

type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

/**
 * Lazy singleton: importing this module must not open a database connection.
 * Tests and tooling import the schema bundle without DATABASE_URL set.
 */
export const auth: BetterAuthInstance = new Proxy({} as BetterAuthInstance, {
  get(_target, property, receiver) {
    if (!initialized) {
      instance = createBetterAuth();
      initialized = true;
    }
    const value = Reflect.get(instance as object, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
let instance: BetterAuthInstance | null = null;
let initialized = false;
export type Auth = BetterAuthInstance;
