// src/lib/data-services.ts

import { categories, type Category } from '@/Data/categories'
import { products, type Product } from '@/Data/products'

// Service functions for data operations
// These can be easily replaced with API calls in the future

export const categoryService = {
  // Get all categories
  getAll: (): Category[] => {
    return categories
  },

  // Get category by ID
  getById: (id: string): Category | undefined => {
    return categories.find(category => category.id === id)
  },

  // Get category by slug
  getBySlug: (slug: string): Category | undefined => {
    return categories.find(category => category.slug === slug)
  },

  // Get categories with product count
  getWithProductCount: (): (Category & { productCount: number })[] => {
    return categories.map(category => ({
      ...category,
      productCount: products.filter(product => product.categoryId === category.id).length
    }))
  }
}

export const productService = {
  // Get all products
  getAll: (): Product[] => {
    console.log('productService.getAll called, returning', products.length, 'products')
    return products
  },

  // Get product by ID
  getById: (id: string): Product | undefined => {
    console.log('productService.getById called with id:', id)
    const product = products.find(product => product.id === id)
    console.log('Found product:', product ? product.name : 'Not found')
    return product
  },

  // Get products by category ID
  getByCategoryId: (categoryId: string): Product[] => {
    return products.filter(product => product.categoryId === categoryId)
  },

  // Get products by multiple category IDs
  getByCategoryIds: (categoryIds: string[]): Product[] => {
    return products.filter(product => categoryIds.includes(product.categoryId))
  },

  // Get featured products (first 8 products)
  getFeatured: (limit: number = 8): Product[] => {
    return products.slice(0, limit)
  },

  // Search products by name or category
  search: (query: string): Product[] => {
    const searchTerm = query.toLowerCase()
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    )
  },

  // Get products count by category
  getCountByCategory: (): Record<string, number> => {
    const counts: Record<string, number> = {}
    categories.forEach(category => {
      counts[category.id] = products.filter(product => product.categoryId === category.id).length
    })
    return counts
  },

  // Get total products count
  getTotalCount: (): number => {
    return products.length
  },

  // Get products with pagination
  getPaginated: (page: number = 1, limit: number = 12): {
    products: Product[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProducts = products.slice(startIndex, endIndex)
    
    return {
      products: paginatedProducts,
      totalCount: products.length,
      totalPages: Math.ceil(products.length / limit),
      currentPage: page
    }
  }
}
