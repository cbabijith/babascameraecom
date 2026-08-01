// src/types/settings.ts
export interface DeliverySettings {
  enableFreeDelivery?: boolean;
  deliveryChargeFlat?: number;
  freeDeliveryThreshold?: number;
}

export interface SpecificSettingsResponse {
  success: boolean;
  message: string;
  result: {
    _id: string;
    scope: string; // "Delivery"
    data: DeliverySettings;
    createdAt: string;
  };
}
