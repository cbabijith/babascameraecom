import { db, settings, type JsonValue } from "@babascamera/db";
import { z } from "zod";

import {
  apiError,
  apiSuccess,
  authorizeAdminApi,
  zodFieldErrors,
} from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { nullableText } from "@/lib/forms/zod-forms";
import {
  settingGroups,
  settingsSchemas,
  type SettingKey,
} from "@/features/settings/schemas/settings-schemas";

export const dynamic = "force-dynamic";

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

export async function PUT(request: Request) {
  const authorization = await authorizeAdminApi(request, "settings");
  if ("response" in authorization) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("MALFORMED_REQUEST", "Request body must be valid JSON.", 400);
  }

  const parsed = saveSettingSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const first = flattened.formErrors[0]
      ?? Object.values(zodFieldErrors(parsed.error))[0]?.[0]
      ?? "Check the submitted fields and try again.";
    return apiError("VALIDATION_FAILED", first, 422, zodFieldErrors(parsed.error));
  }

  try {
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
      domainEvent("settings.changed", {
        actorId: authorization.admin.id,
        key: parsed.data.key,
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("SETTINGS_OPERATION_FAILED", error.message, 409);
    }
    console.error("Settings save failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Settings could not be saved.", 500);
  }
}
