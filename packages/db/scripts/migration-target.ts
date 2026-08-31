const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
const PLACEHOLDER_PASSWORD_PATTERN = /^(?:\[|<)?your(?:[-_ ]?database)?[-_ ]?password(?:\]|>)?$/i;

export interface MigrationTarget {
  databaseUrl: string;
  ssl: false | "require";
}

function decodeUrlPart(value: string, label: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`DATABASE_URL has an invalid encoded ${label}.`);
  }
}

export function validateMigrationTarget(
  rawDatabaseUrl: string | undefined,
): MigrationTarget {
  const databaseUrl = rawDatabaseUrl?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for db:migrate. No fallback credentials are used for safety.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  const username = decodeUrlPart(parsed.username, "username");
  const password = decodeUrlPart(parsed.password, "password");
  const databaseName = decodeUrlPart(parsed.pathname.replace(/^\/+/, ""), "database name");
  const hostname = parsed.hostname.toLowerCase();
  const isLocal = LOCAL_DATABASE_HOSTS.has(hostname);

  if (!username) {
    throw new Error("DATABASE_URL must include a database username.");
  }
  if (!password || PLACEHOLDER_PASSWORD_PATTERN.test(password)) {
    throw new Error(
      "DATABASE_URL must include the real database password; placeholder passwords are refused.",
    );
  }
  if (!databaseName) {
    throw new Error("DATABASE_URL must name the target database.");
  }
  if (!isLocal && parsed.searchParams.get("sslmode")?.toLowerCase() === "disable") {
    throw new Error("Remote database migrations require TLS; sslmode=disable is refused.");
  }

  return {
    databaseUrl,
    ssl: isLocal ? false : "require",
  };
}
