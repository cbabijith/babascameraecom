import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase, users, accounts, eq } from "../packages/db/src/index.ts";
import * as schema from "../packages/db/src/schema/index.ts";

const db = getDatabase();

const auth = betterAuth({
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
  baseURL: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET || "babas-camera-super-secret-auth-key-2026-very-secure-32chars",
});

const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim() || "info@babascamera.com";
const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
const adminName = "Administrator";

if (!adminPassword || adminPassword.length < 8) {
  throw new Error(
    "ADMIN_SEED_PASSWORD is required (min 8 chars) — set it explicitly instead of committing a default.",
  );
}

console.log(`Setting up admin user ${adminEmail}...`);

// Check if user already exists
const existing = await db.query.users.findFirst({
  where: eq(users.email, adminEmail),
  with: {
    accounts: true,
  },
});

if (existing) {
  console.log(`User ${adminEmail} exists (ID: ${existing.id}). Updating password and ensuring role is 'admin'...`);
  
  // Update user fields
  await db
    .update(users)
    .set({
      role: "admin",
      isActive: true,
      name: adminName,
      fullName: adminName,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.id));

  // Remove old accounts for this user to ensure clean state
  await db.delete(accounts).where(eq(accounts.userId, existing.id));

  // Hash new password using Better Auth
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(adminPassword);

  // Insert credential account
  await db.insert(accounts).values({
    accountId: existing.id,
    providerId: "credential",
    userId: existing.id,
    password: hashedPassword,
    issuer: "local:credential",
  });
  console.log("Admin account password set.");
} else {
  console.log(`Creating new user ${adminEmail}...`);
  await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });

  await db
    .update(users)
    .set({
      role: "admin",
      isActive: true,
      fullName: adminName,
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(users.email, adminEmail));
}

console.log("Verifying sign in with info@babascamera.com and admin123...");
const signInRes = await auth.api.signInEmail({
  body: {
    email: adminEmail,
    password: adminPassword,
  },
});

console.log("Admin login verification SUCCESS! User Details:", {
  id: signInRes.user?.id,
  email: signInRes.user?.email,
  name: signInRes.user?.name,
  token: signInRes.token,
});

process.exit(0);
