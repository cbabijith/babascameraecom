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

export type BankTransferDisplay = {
  account_name: string;
  bank_name: string;
  account_number?: string;
  account_number_masked?: string;
  ifsc: string;
  branch?: string;
  upi_id?: string;
  upi_merchant_name?: string;
};

export const getBankTransferDisplay =
  async (): Promise<BankTransferDisplay | null> => {
    const { data } = await apiClient.get<{
      success: boolean;
      result?: { data?: { bank_transfer_display?: Partial<BankTransferDisplay> } };
    }>("/settings/specific", { params: { scope: "checkout" } });
    const value = data.result?.data?.bank_transfer_display;
    if (
      !data.success ||
      !value?.account_name ||
      !value.bank_name ||
      !value.ifsc
    ) {
      return null;
    }
    return value as BankTransferDisplay;
  };
