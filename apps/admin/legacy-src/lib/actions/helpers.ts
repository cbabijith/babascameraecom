import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

export function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalFormString(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value || null;
}

export function formInteger(formData: FormData, key: string, fallback = 0) {
  const raw = formString(formData, key);
  if (!/^-?\d+$/.test(raw)) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : fallback;
}

export function validationMessage(error: ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export function redirectWithMessage(
  path: string,
  result: { success?: string; error?: string },
): never {
  const url = new URL(path, "http://admin.local");
  if (result.success) url.searchParams.set("success", result.success);
  if (result.error) url.searchParams.set("error", result.error);
  redirect(`${url.pathname}${url.search}`);
}

export function revalidateAdminPaths(...paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

export async function writeAuditLog(input: {
  actorId: string;
  action: string;
  table: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  // Row-level audit triggers record the authenticated actor and snapshots in
  // the same database transaction as each write. Client-side audit inserts are
  // intentionally forbidden so an administrator cannot forge history.
  void input;
}
