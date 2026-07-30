import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { validateMigrationTarget } from "./migration-target";

const migrationFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const target = validateMigrationTarget(process.env.DATABASE_URL, process.env.SUPABASE_PROJECT_REF);
const client = postgres(target.databaseUrl, {
  max: 1,
  prepare: false,
  ssl: target.ssl,
});

try {
  await migrate(drizzle(client), {
    migrationsFolder: migrationFolder,
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations",
  });
} finally {
  await client.end({ timeout: 5 });
}
