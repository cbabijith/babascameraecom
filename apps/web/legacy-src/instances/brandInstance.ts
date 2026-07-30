import { apiClient } from '@/lib/apiClient'
import type { Brand, BrandListResponse } from '@/types/brand'

/** GET /brand/active */
export const getActiveBrands = async (): Promise<Brand[]> => {
  const res = await apiClient.get<BrandListResponse>('/brand/active')
  if (res.data?.success && Array.isArray(res.data.results)) {
    return res.data.results
  }
  throw new Error(res.data?.message || 'Failed to fetch brands')
}
