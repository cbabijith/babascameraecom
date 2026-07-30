import { describe, expect, test } from "bun:test";

import { validateMigrationTarget } from "../scripts/migration-target";

const projectRef = "abcdefghijklmnopqrst";

describe("migration target validation", () => {
  test("accepts a password-protected local Supabase database without a project reference", () => {
    const target = validateMigrationTarget(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      undefined,
    );

    expect(target.ssl).toBe(false);
  });

  test("accepts matching hosted direct, session-pooler, and transaction-pooler targets", () => {
    const direct = validateMigrationTarget(
      `postgresql://postgres:secret@db.${projectRef}.supabase.co:5432/postgres`,
      projectRef,
    );
    const sessionPooler = validateMigrationTarget(
      `postgresql://postgres.${projectRef}:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`,
      projectRef,
    );
    const transactionPooler = validateMigrationTarget(
      `postgresql://postgres.${projectRef}:secret@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`,
      projectRef,
    );

    expect(direct.ssl).toBe("require");
    expect(sessionPooler.ssl).toBe("require");
    expect(transactionPooler.ssl).toBe("require");
  });

  test("rejects missing, placeholder, and non-PostgreSQL credentials", () => {
    expect(() => validateMigrationTarget(undefined, undefined)).toThrow("DATABASE_URL is required");
    expect(() =>
      validateMigrationTarget(
        `postgresql://postgres:%5BYOUR-PASSWORD%5D@db.${projectRef}.supabase.co:5432/postgres`,
        projectRef,
      ),
    ).toThrow("placeholder passwords");
    expect(() => validateMigrationTarget("https://example.com/postgres", undefined)).toThrow(
      "postgres://",
    );
  });

  test("rejects an unverified or mismatched hosted Supabase target", () => {
    const target = `postgresql://postgres.${projectRef}:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`;

    expect(() => validateMigrationTarget(target, undefined)).toThrow("SUPABASE_PROJECT_REF");
    expect(() => validateMigrationTarget(target, "zyxwvutsrqponmlkjihg")).toThrow("does not match");
  });

  test("rejects remote TLS opt-out", () => {
    expect(() =>
      validateMigrationTarget(
        `postgresql://postgres:secret@db.${projectRef}.supabase.co:5432/postgres?sslmode=disable`,
        projectRef,
      ),
    ).toThrow("require TLS");
  });
});
