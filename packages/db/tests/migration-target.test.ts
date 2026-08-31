import { describe, expect, test } from "bun:test";

import { validateMigrationTarget } from "../scripts/migration-target";

describe("migration target validation", () => {
  test("accepts a password-protected local database without TLS", () => {
    const target = validateMigrationTarget(
      "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    );

    expect(target.ssl).toBe(false);
  });

  test("accepts a remote database and requires TLS", () => {
    const target = validateMigrationTarget(
      "postgresql://postgres:secret@pg-sg.railway.internal:5432/railway",
    );

    expect(target.ssl).toBe("require");
  });

  test("rejects missing, placeholder, and non-PostgreSQL credentials", () => {
    expect(() => validateMigrationTarget(undefined)).toThrow("DATABASE_URL is required");
    expect(() =>
      validateMigrationTarget("postgresql://postgres:%5BYOUR-PASSWORD%5D@db.example.com:5432/postgres"),
    ).toThrow("placeholder passwords");
    expect(() => validateMigrationTarget("https://example.com/postgres")).toThrow(
      "postgres://",
    );
  });

  test("rejects unnamed databases and missing users", () => {
    expect(() =>
      validateMigrationTarget("postgresql://postgres:secret@db.example.com:5432"),
    ).toThrow("target database");
    expect(() =>
      validateMigrationTarget("postgresql://:secret@db.example.com:5432/postgres"),
    ).toThrow("username");
  });

  test("rejects remote TLS opt-out", () => {
    expect(() =>
      validateMigrationTarget(
        "postgresql://postgres:secret@db.example.com:5432/postgres?sslmode=disable",
      ),
    ).toThrow("require TLS");
  });
});
