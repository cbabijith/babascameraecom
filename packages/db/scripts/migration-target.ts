const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);
const SUPABASE_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
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

function isSupabaseHost(hostname: string): boolean {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(".supabase.com");
}

function isSupabasePoolerHost(hostname: string): boolean {
  return hostname.endsWith(".pooler.supabase.com");
}

export function validateMigrationTarget(
  rawDatabaseUrl: string | undefined,
  rawExpectedProjectRef: string | undefined,
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

  if (isSupabaseHost(hostname)) {
    const expectedProjectRef = rawExpectedProjectRef?.trim().toLowerCase();
    if (!expectedProjectRef) {
      throw new Error(
        "SUPABASE_PROJECT_REF is required for hosted Supabase migrations so the target can be verified.",
      );
    }
    if (!SUPABASE_PROJECT_REF_PATTERN.test(expectedProjectRef)) {
      throw new Error("SUPABASE_PROJECT_REF must be the 20-character lowercase project reference.");
    }
    if (databaseName !== "postgres") {
      throw new Error("Hosted Supabase migrations must explicitly target the postgres database.");
    }

    if (isSupabasePoolerHost(hostname)) {
      if (!username.endsWith(`.${expectedProjectRef}`)) {
        throw new Error(
          "DATABASE_URL pooler username does not match SUPABASE_PROJECT_REF; migration refused.",
        );
      }
    } else if (hostname !== `db.${expectedProjectRef}.supabase.co`) {
      throw new Error(
        "DATABASE_URL hostname does not match SUPABASE_PROJECT_REF; migration refused.",
      );
    }
  }

  return {
    databaseUrl,
    ssl: isLocal ? false : "require",
  };
}
