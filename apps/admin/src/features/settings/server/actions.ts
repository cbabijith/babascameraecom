"use server";

import { db, eq, settings, type JsonValue } from "@babascamera/db";
import { z } from "zod";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import { adminEvents, domainEvent } from "@/lib/events";
import { idSchema, nullableText } from "@/lib/forms/zod-forms";

import { settingGroups, settingsSchemas, type SettingKey } from "../schemas/settings-schemas";

function parseJson(value: string, key: SettingKey): JsonValue {
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new AdminActionError(
      `Value for ${key} is invalid. Check the documented object fields and JSON types.`,
    );
  }
  const parsed = settingsSchemas[key].safeParse(json);
  if (!parsed.success) {
    throw new AdminActionError(
      `Value for ${key} is invalid. Check the documented object fields and JSON types.`,
    );
  }
  return parsed.data as JsonValue;
}

const saveSettingSchema = z.object({
  key: z.enum([
    "store.profile",
    "shipping.rules",
    "cod.rules",
    "seo.defaults",
    "notifications.toggles",
    "homepage.hero",
  ]),
  label: nullableText,
  value: z.string(),
});

export async function saveSettingAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("settings");
  try {
    const parsed = saveSettingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const values = {
      key: parsed.data.key,
      label: parsed.data.label,
      group: settingGroups[parsed.data.key],
      value: parseJson(parsed.data.value, parsed.data.key),
      updatedAt: new Date(),
    };
    await db
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          label: values.label,
          group: values.group,
          value: values.value,
          updatedAt: values.updatedAt,
        },
      });

    await adminEvents.emit(
      domainEvent("settings.changed", { actorId: admin.id, key: parsed.data.key }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Settings could not be saved.",
      "Settings save failed.",
    );
  }
}

export async function deleteSettingAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("settings");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [deleted] = await db
      .delete(settings)
      .where(eq(settings.id, parsed.data.id))
      .returning({ id: settings.id, key: settings.key });
    if (!deleted) throw new AdminActionError("Setting not found.");

    await adminEvents.emit(
      domainEvent("settings.changed", { key: deleted.key }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Setting could not be deleted.",
      "Setting deletion failed.",
    );
  }
}

