import type { CustomerType } from "@babas/domain";
import type { Json } from "@babas/database";

type ProfilePayload = Record<string, unknown>;

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function profilePatch(payload: ProfilePayload): Json {
  const gstData =
    payload.gstData && typeof payload.gstData === "object"
      ? (payload.gstData as Record<string, unknown>)
      : {};
  const requestedType =
    typeof payload.userType === "string" ? payload.userType.toLowerCase() : "";
  const customerType: CustomerType =
    requestedType === "retailer" ? "retailer" : "consumer";

  return {
    full_name: optionalString(payload.name),
    phone: optionalString(payload.phone),
    customer_type: customerType,
    gstin: optionalString(gstData.gstNumber)?.toUpperCase() ?? null,
    registered_company_name: optionalString(gstData.registeredCompanyName),
  };
}
