/**
 * Applies packages/db/scripts/legacy-compat-schema.sql to DATABASE_URL.
 * Used by CI (and local docker setups) before `db:migrate` so the initial
 * migration's auth/storage compatibility objects exist on plain PostgreSQL.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const sqlPath = fileURLToPath(new URL("./legacy-compat-schema.sql", import.meta.url));
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply the legacy compatibility schema.");
}

const client = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await client.file(sqlPath);
  console.log("Legacy auth/storage compatibility schema applied.");
} finally {
  await client.end({ timeout: 5 });
}
