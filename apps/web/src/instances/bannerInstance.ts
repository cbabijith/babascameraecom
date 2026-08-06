// src/instances/bannerInstance.ts

import { apiClient, ApiResponse } from '@/lib/apiClient';
import { Banner, BannerQueryParams } from '@/types/banner';

export interface BannerResponse extends ApiResponse {
  results: Banner[];
  currentPage: number;
  totalCount: number;
  totalPages: number;
  latestCount: number;
}

export interface BannerDetailResponse extends ApiResponse {
  result: Banner;
}

// Get banners with optional filters
export const getBanners = async (params?: BannerQueryParams): Promise<BannerResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.type) queryParams.set('type', params.type);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);

    const response = await apiClient.get<BannerResponse>(`/banner?${queryParams.toString()}`);
    
    if (response.data.success) {
      return response.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch banners');
  } catch (error) {
    console.error('getBanners error:', error);
    throw error;
  }
};

// Get hero banners specifically
export const getHeroBanners = async (params?: Omit<BannerQueryParams, 'type'>): Promise<BannerResponse> => {
  return getBanners({ ...params, type: 'Hero' });
};

// Get both featured banners in a single HTTP request (optimizes network latency)
export const getFeaturedBannersCombined = async (): Promise<{
  primary: Banner | null;
  secondary: Banner | null;
}> => {
  try {
    const response = await getBanners({ limit: 2 });
    const activeBanners = (response.results || []).filter(
      (banner) => banner.status === 'Active' && banner.visibility === 'Show'
    );
    return {
      primary: activeBanners[0] || null,
      secondary: activeBanners[1] || activeBanners[0] || null,
    };
  } catch (error) {
    console.error('getFeaturedBannersCombined error:', error);
    return { primary: null, secondary: null };
  }
};

// Get featured product primary banner
export const getFeaturedProductPrimary = async (): Promise<Banner | null> => {
  try {
    const response = await getBanners({ type: 'Featured_Product_Primary', limit: 1 });
    const activeBanners = response.results.filter(
      banner => banner.status === 'Active' && banner.visibility === 'Show'
    );
    return activeBanners[0] || null;
  } catch (error) {
    console.error('getFeaturedProductPrimary error:', error);
    return null;
  }
};

// Get featured product secondary banner
export const getFeaturedProductSecondary = async (): Promise<Banner | null> => {
  try {
    const response = await getBanners({ type: 'Featured_Product_Secondary', limit: 1 });
    const activeBanners = response.results.filter(
      banner => banner.status === 'Active' && banner.visibility === 'Show'
    );
    return activeBanners[0] || null;
  } catch (error) {
    console.error('getFeaturedProductSecondary error:', error);
    return null;
  }
};

// Get banner by ID
export const getBannerById = async (bannerId: string): Promise<Banner> => {
  try {
    const response = await apiClient.get<BannerDetailResponse>(`/banner/${bannerId}`);
    
    if (response.data.success && response.data.result) {
      return response.data.result;
    }
    
    throw new Error(response.data.message || 'Failed to fetch banner details');
  } catch (error) {
    console.error('getBannerById error:', error);
    throw error;
  }
};

// Get banner collections (products) by banner ID
export const getBannerCollections = async (bannerId: string): Promise<Banner['collections']> => {
  try {
    const banner = await getBannerById(bannerId);
    return banner.collections || [];
  } catch (error) {
    console.error('getBannerCollections error:', error);
    throw error;
  }
};
