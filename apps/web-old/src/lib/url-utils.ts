// src/lib/url-utils.ts

export const routes = {
  home: '/',
  products: '/products',
  productDetails: (productId: string) => `/products/${productId}`,
  categoryProducts: (categoryId: string) => `/products/category/${categoryId}`,
  
  // Breadcrumb generation
  generateBreadcrumb: (product: { name: string; categoryId?: string }) => {
    return [
      { name: 'HOME', href: routes.home },
      { name: 'ALL PRODUCTS', href: routes.products },
      { name: 'DIGITAL CAMERA', href: routes.products }, // This could be dynamic based on categoryId
      { name: product.name, href: '#', current: true }
    ]
  }
}

// Fix hydration mismatch by using consistent number formatting
export const formatPrice = (price: number): string => {
  // Use a consistent formatting that works on both server and client
  return `₹${new Intl.NumberFormat('en-IN').format(price)}`
}

// Alternative simple formatting to avoid hydration issues
export const formatPriceSimple = (price: number): string => {
  // Convert to string and add commas manually for Indian number system
  const priceStr = price.toString()
  let result = ''
  let count = 0
  
  // Add commas from right to left
  for (let i = priceStr.length - 1; i >= 0; i--) {
    if (count !== 0 && count % 2 === 0 && i !== 0) {
      result = ',' + result
    } else if (count !== 0 && count === 3) {
      result = ',' + result
    }
    result = priceStr[i] + result
    count++
  }
  
  return `₹${result}`
}

export const calculateDiscount = (originalPrice: number, currentPrice: number): number => {
  return Math.round((1 - currentPrice / originalPrice) * 100)
}

export const generateProductUrl = (productId: string): string => {
  
  return `/products/${productId}` // For now, just use ID
  // Future: return `/products/${productId}-${slug}` // SEO-friendly with slug
}

export const isValidProductId = (id: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(id) && id.length > 0
}