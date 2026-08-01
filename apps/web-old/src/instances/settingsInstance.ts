// src/instances/settingsInstance.ts
import { apiClient } from "@/lib/apiClient";
import type { DeliverySettings, SpecificSettingsResponse } from "@/types/settings";

// NEW

export const getSpecificSettings = async (
  scope: string
): Promise<DeliverySettings> => {
  const { data } = await apiClient.get<SpecificSettingsResponse>(
    "/settings/specific",
    { params: { scope } }
  );

  if (data?.success && data?.result?.data) {
    return data.result.data;
  }

  throw new Error(data?.message || "Failed to fetch settings");
};
