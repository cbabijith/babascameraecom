import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDatabase } from "./client";
import { settings } from "./schema/tables";

/**
 * Shared secret for the storefront MCP connector (/api/mcp). Stored as a
 * settings row so every instance of the app agrees on the same value without
 * any env configuration. The token travels in the connector URL
 * (?token=…), which is the "just a link" auth model the store owner asked
 * for: possessing the link is the credential. Rotate by deleting the row.
 */
const SETTINGS_KEY = "mcp.connect";

type McpConnectValue = { token: string };

export async function ensureMcpConnectToken(): Promise<string> {
  const database = getDatabase();
  const existing = await database
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEY))
    .limit(1);

  const current = existing[0]?.value as McpConnectValue | undefined;
  if (current && typeof current.token === "string" && current.token.length >= 32) {
    return current.token;
  }

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  await database
    .insert(settings)
    .values({
      key: SETTINGS_KEY,
      value: { token } satisfies McpConnectValue,
      label: "MCP connector token (internal)",
      group: "internal",
    })
    .onConflictDoNothing({ target: settings.key });

  // Lost the race? Re-read whatever the winner stored.
  const after = await database
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEY))
    .limit(1);
  const stored = after[0]?.value as McpConnectValue | undefined;
  return stored?.token ?? token;
}

export async function getMcpConnectToken(): Promise<string | null> {
  const database = getDatabase();
  const rows = await database
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEY))
    .limit(1);
  const value = rows[0]?.value as McpConnectValue | undefined;
  return value?.token ?? null;
}
