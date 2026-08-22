export interface BrandImage {
  _id: string
  name: string
  key: string
  mimetype: string
  size: number
  thumbnail: boolean
}

export interface Brand {
  _id: string
  name: string
  image?: BrandImage
  status?: string
  visibility?: string
  createdAt?: string
  code?: string
}

export interface BrandListResponse {
  success: boolean
  message: string
  currentPage?: number
  results: Brand[]
  latestCount?: number
  totalCount?: number
  totalPages?: number
}
