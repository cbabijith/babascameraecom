import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";

function iso(value: Date) {
  return value.toISOString();
}

export async function getSettings() {
  await requirePermission("settings");
  const rows = await db.query.settings.findMany({
    orderBy: (table, { asc }) => [asc(table.group), asc(table.key)],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    serializedValue: JSON.stringify(row.value, null, 2),
  }));
}
