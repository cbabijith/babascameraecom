// src/instances/settingsInstance.ts
import { apiClient } from "@/lib/apiClient";
import type { DeliverySettings, SpecificSettingsResponse } from "@/types/settings";

const DEFAULT_DELIVERY_SETTINGS: Required<DeliverySettings> = {
  enableFreeDelivery: true,
  deliveryChargeFlat: 100,
  freeDeliveryThreshold: 3000,
};

export const getSpecificSettings = async (
  scope: string
): Promise<DeliverySettings> => {
  try {
    const { data } = await apiClient.get<SpecificSettingsResponse>(
      "/settings/specific",
      {
        params: { scope },
      }
    );

    if (data?.success && data?.result?.data) {
      return data.result.data;
    }

    return DEFAULT_DELIVERY_SETTINGS;
  } catch {
    return DEFAULT_DELIVERY_SETTINGS;
  }
};
