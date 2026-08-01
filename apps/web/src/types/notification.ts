// src/types/notification.ts
import type { Product } from "@/types/product";
import type { ApiResponse } from "@/lib/apiClient";

export interface NotificationItem {
  _id: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
    code?: string;
    phone?: string;
  };
  // API can return populated product or just id
  product: Product | string;
  createdAt: string;
}

export interface NotificationsResponse extends ApiResponse {
  results: NotificationItem[];
  // some APIs may also return totalCount, keep optional
  totalCount?: number;
}

export interface AddNotificationResponse extends ApiResponse {
  result: {
    _id: string;
    user: string;
    product: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
  };
}
