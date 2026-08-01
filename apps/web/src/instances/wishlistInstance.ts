// src/instances/wishlistInstance.ts
import { apiClient, ApiResponse } from '@/lib/apiClient';
import { Product } from '@/types/product';

export interface WishlistItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    code: string;
  };
  // NOTE: API may return populated product or just productId (string)
  product: Product | string;
  createdAt: string;
}

export interface WishlistResponse extends ApiResponse {
  results: WishlistItem[];
  totalCount: number;
}

export interface AddWishlistResponse extends ApiResponse {
  result: WishlistItem;
}

export const addToWishlist = async (productId: string): Promise<WishlistItem> => {
  const response = await apiClient.post<AddWishlistResponse>(`/wishlist/${productId}`);
  if (response.data?.success && response.data.result) return response.data.result;
  throw new Error(response.data?.message || 'Failed to add to wishlist');
};

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const response = await apiClient.get<WishlistResponse>('/wishlist');
  if (response.data?.success) return response.data.results || [];
  throw new Error(response.data?.message || 'Failed to fetch wishlist');
};

export const removeFromWishlist = async (wishlistId: string): Promise<void> => {
  const response = await apiClient.delete<ApiResponse>(`/wishlist/user/${wishlistId}`);
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to remove from wishlist');
  }
};
