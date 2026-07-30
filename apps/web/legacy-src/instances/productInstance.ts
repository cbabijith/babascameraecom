import { apiClient, ApiResponse } from '@/lib/apiClient';
import { Product, Brand } from '@/types/product';

/** Listing pages (category/brand) only */
export type ListingSortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' |'popular' | 'newest';
/** General sort (e.g., home/top-sellers can use 'popular') */
export type SortOption = ListingSortOption;

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
  sort?: SortOption; // <- can be listing sort OR 'popular'
  similar?: string;
}

export const isValidListingSort = (s?: string): s is ListingSortOption =>
  s === 'name_asc' || s === 'name_desc' || s === 'price_asc' || s === 'price_desc' || s === 'newest' || s === 'popular';

export const isValidGeneralSort = (s?: string): s is SortOption =>
  isValidListingSort(s) || s === 'popular';


/** Category-scoped fetch: restrict to listing sorts */
export const getProductsByCategory = async (
  categoryId: string,
  params?: Omit<ProductQueryParams, 'category'>
): Promise<ProductResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('category', categoryId);

    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.brand) queryParams.set('brand', params.brand);
    if (params?.sort && isValidListingSort(params.sort)) queryParams.set('sort', params.sort);
    if (params?.similar) queryParams.set('similar', params.similar);

    const response = await apiClient.get<ProductResponse>(`/product?${queryParams.toString()}`);
    if (response.data.success) return response.data;
    throw new Error(response.data.message || 'Failed to fetch products');
  } catch (error) {
    console.error('getProductsByCategory error:', error);
    throw error;
  }
};

/** Brand-scoped fetch: restrict to listing sorts */
export const getProductsByBrand = async (
  brandId: string,
  params?: Omit<ProductQueryParams, 'brand'>
): Promise<ProductResponse> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set('brand', brandId);

    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.category) queryParams.set('category', params.category);
    if (params?.sort && isValidListingSort(params.sort)) queryParams.set('sort', params.sort);
    if (params?.similar) queryParams.set('similar', params.similar);

    const response = await apiClient.get<ProductResponse>(`/product?${queryParams.toString()}`);
    if (response.data.success) return response.data;
    throw new Error(response.data.message || 'Failed to fetch brand products');
  } catch (error) {
    console.error('getProductsByBrand error:', error);
    throw error;
  }
};

/** General multi-filter fetch: allow listing sorts AND 'popular' */
export const getProducts = async (params?: ProductQueryParams): Promise<ProductResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set('category', params.category);
    if (params?.brand) queryParams.set('brand', params.brand);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.sort && isValidGeneralSort(params.sort)) queryParams.set('sort', params.sort);
    if (params?.similar) queryParams.set('similar', params.similar);

    const response = await apiClient.get<ProductResponse>(`/product?${queryParams.toString()}`);
    if (response.data.success) return response.data;
    throw new Error(response.data.message || 'Failed to fetch products');
  } catch (error) {
    console.error('getProducts error:', error);
    throw error;
  }
};

export const getProductById = async (productId: string): Promise<Product> => {
  try {
    const response = await apiClient.get<ProductDetailResponse>(`/product/${productId}`);
    if (response.data.success && response.data.result) return response.data.result;
    throw new Error(response.data.message || 'Failed to fetch product details');
  } catch (error) {
    console.error('getProductById error:', error);
    throw error;
  }
};

export const getBrandById = async (brandId: string): Promise<Brand> => {
  try {
    const response = await apiClient.get<BrandDetailResponse>(`/brand/${brandId}`);
    if (response.data.success && response.data.result) return response.data.result;
    throw new Error(response.data.message || 'Failed to fetch brand details');
  } catch (error) {
    console.error('getBrandById error:', error);
    throw error;
  }
};
