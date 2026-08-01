import { apiClient, ApiResponse } from '@/lib/apiClient';
import { Product } from '@/types/product';

// keep the same sort values used elsewhere
export type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'popular' | 'newest';

export interface SearchResponse extends ApiResponse {
  results: Product[];
  currentPage: number;
  totalCount: number;
  totalPages: number;
  latestCount: number;
}

export interface SearchQueryParams {
  search: string;
  page?: number;
  limit?: number;
  brand?: string;       
  sort?: SortOption; 
}

export const searchProducts = async (params: SearchQueryParams): Promise<SearchResponse> => {
  try {
    const queryParams = new URLSearchParams();

    queryParams.set('search', params.search);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.brand) queryParams.set('brand', params.brand);           // 🔥 pass brand
    if (params.sort) queryParams.set('sort', params.sort);             // 🔥 pass sort

    const response = await apiClient.get<SearchResponse>(`/product?${queryParams.toString()}`);

    if (response.data.success) {
      return response.data;
    }

    throw new Error(response.data.message || 'Failed to search products');
  } catch (error) {
    console.error('searchProducts error:', error);
    throw error;
  }
};
