import { apiClient, type ApiResponse } from '@/lib/apiClient';
import type { Product, Brand } from '@/types/product';
import type { AxiosRequestConfig } from "axios"; // 👈 add

export interface ProductResponse extends ApiResponse {
  results: Product[];
  currentPage: number;
  totalCount: number;
  totalPages: number;
  latestCount: number;
}

export interface ProductDetailResponse extends ApiResponse {
  result: Product;
}

export interface BrandDetailResponse extends ApiResponse {
  result: Brand;
}

export interface ProductQueryParams {
  category?: string;
  brand?: string;
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  similar?: string;
}

// 👇 Add optional axios config as 3rd arg
export const getProductsByCategory = async (
  categoryId: string,
  params?: Omit<ProductQueryParams, 'category'>,
  axiosConfig?: AxiosRequestConfig & { showToast?: boolean }
): Promise<ProductResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('category', categoryId);

    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.brand) queryParams.set('brand', params.brand);
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.similar) queryParams.set('similar', params.similar);

    const response = await apiClient.get<ProductResponse>(
      `/product?${queryParams.toString()}`,
      axiosConfig // 👈 forward options (e.g., { showToast:false })
    );

    if (response.data.success) {
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to fetch products');
  } catch (error) {
    console.error('getProductsByCategory error:', error);
    throw error;
  }
};
