// instances/categoryInstance.ts

import { apiClient, ApiResponse } from '@/lib/apiClient';
import { Category } from '@/types/product';

export interface CategoryResponse extends ApiResponse {
  results: Category[];
}

export interface CategoryDetailResponse extends ApiResponse {
  result: Category;
}

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await apiClient.get<CategoryResponse>('/category?limit=-1');
    
    if (response.data.success) {
      return response.data.results || [];
    }
    
    throw new Error(response.data.message || 'Failed to fetch categories');
  } catch (error) {
    console.error('getCategories error:', error);
    throw error;
  }
};

export const getCategoryById = async (id: string): Promise<Category> => {
  try {
    const response = await apiClient.get<CategoryDetailResponse>(`/category/${id}`);
    
    if (response.data.success && response.data.result) {
      return response.data.result;
    }
    
    throw new Error(response.data.message || 'Failed to fetch category');
  } catch (error) {
    console.error('getCategoryById error:', error);
    throw error;
  }
};

export const getCategoriesByBrand = async (brandId: string): Promise<Category[]> => {
  try {
    const response = await apiClient.get<CategoryResponse>(`/category?brand=${brandId}`);
    
    if (response.data.success) {
      return response.data.results || [];
    }
    
    throw new Error(response.data.message || 'Failed to fetch categories by brand');
  } catch (error) {
    console.error('getCategoriesByBrand error:', error);
    throw error;
  }
};
