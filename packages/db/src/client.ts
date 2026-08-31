import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type SqlClient = ReturnType<typeof postgres>;

function createSqlClient(): SqlClient {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error(
      "DATABASE_URL is required when the database is first used. Use the verified PostgreSQL URL for the target environment.",
    );
  }

  return postgres(databaseUrl, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: 10,
    prepare: false,
  });
}

function createDatabase() {
  return drizzle(getSqlClient(), {
    schema,
  });
}

export type Database = ReturnType<typeof createDatabase>;

const singleton = globalThis as typeof globalThis & {
  __babasCameraDatabase?: Database;
  __babasCameraSqlClient?: SqlClient;
};

export function getSqlClient(): SqlClient {
  singleton.__babasCameraSqlClient ??= createSqlClient();
  return singleton.__babasCameraSqlClient;
}

export function getDatabase(): Database {
  singleton.__babasCameraDatabase ??= createDatabase();
  return singleton.__babasCameraDatabase;
}

const lazySqlTarget = (() => undefined) as unknown as SqlClient;

export const sqlClient = new Proxy(lazySqlTarget, {
  apply(_target, thisArgument, argumentsList) {
    return Reflect.apply(getSqlClient(), thisArgument, argumentsList);
  },
  get(_target, property) {
    const target = getSqlClient();
    const value: unknown = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const target = getDatabase();
    const value: unknown = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export async function closeDatabase(): Promise<void> {
  const client = singleton.__babasCameraSqlClient;

  delete singleton.__babasCameraDatabase;
  delete singleton.__babasCameraSqlClient;

  if (client !== undefined) {
    await client.end({ timeout: 5 });
  }
}
