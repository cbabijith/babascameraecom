// src/instances/notificationInstance.ts
import { apiClient, type ApiResponse } from "@/lib/apiClient";
import type {
  NotificationItem,
  NotificationsResponse,
  AddNotificationResponse,
} from "@/types/notification";

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const res = await apiClient.get<NotificationsResponse>("/notification");
  if (res.data?.success) return res.data.results || [];
  throw new Error(res.data?.message || "Failed to fetch notifications");
};

export const addNotification = async (productId: string): Promise<string> => {
  const res = await apiClient.post<AddNotificationResponse>(
    `/notification/add/${productId}`
  );
  if (res.data?.success && res.data?.result?.product) {
    // API returns product id in result.product
    return res.data.result.product;
  }
  throw new Error(res.data?.message || "Failed to create notification");
};

// Optional helper in case you later support delete
export const removeNotification = async (notificationId: string): Promise<void> => {
  const res = await apiClient.delete<ApiResponse>(`/notification/${notificationId}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message || "Failed to remove notification");
  }
};
