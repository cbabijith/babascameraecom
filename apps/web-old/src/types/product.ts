export interface Image {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
}

export interface Brand {
  _id: string;
  name: string;
  image: Image;
  code: string;
}

export interface BrandAssociation {
  brand: Brand;
  position: number;
  status: 'Active' | 'Inactive';
  visibility: 'Show' | 'Hide';
  _id: string;
}

export interface Category {
  _id: string;
  name: string;
  image: Image;
  brands?: BrandAssociation[];
  status: 'Active' | 'Inactive';
  visibility: 'Show' | 'Hide';
  position: number;
  createdAt: string;
  updatedAt?: string;
  code: string;
  isDeleted?: boolean;
  __v?: number;
}

// Price structure based on API response
export interface ProductPrice {
  actualPrice: number;
  salePrice: number;
  gst: number;
  discountPrice: number;
  taxStatus: 'Inclusive' | 'Exclusive';
}

// Product variants
export interface ProductVariants {
  productId: string;
  hsnNumber: string;
  barcode: string;
  color: string;
  colorLabel: string;
  paymentMode: 'Prepaid' | 'COD' | 'Both';
}

// Additional charges
export interface AdditionalCharges {
  additionalChargeReason: string;
  amount: number;
}

// Complete Product interface based on API response
export interface Product {
  _id: string;
  name: string;
  slug?: string;
  description?: string;         
  keyFeatures?: string;        
  specification?: string;        
  images: Image[];
  category: Category;
  brand: Brand;
  price: ProductPrice;
  variants?: ProductVariants;
  additionalCharges?: AdditionalCharges;
  quantity: number;
  lowStockMinQuantity?: number;
  measuringUnits?: string;
  status: 'Active' | 'Inactive';
  visibility?: 'Show' | 'Hide';
  position?: number;
  createdAt: string;
  updatedAt?: string;
  code: string;
  isDeleted?: boolean;
  purchasedCount?: number;
  __v?: number;
  relatedProducts?: Product[];  
}

// Simplified types for listings (without optional fields for cleaner display)
export interface CategoryListing {
  _id: string;
  name: string;
  image: Image;
  code: string;
  status?: string;
  position?: number;
}

export interface BrandListing {
  _id: string;
  name: string;
  image: Image;
  code: string;
  status?: string;
}

export interface ProductListing {
  _id: string;
  name: string;
  images: Image[];
  category: CategoryListing;
  brand: BrandListing;
  price: ProductPrice;
  quantity: number;
  code: string;
  status?: string;
  purchasedCount?: number;
}
