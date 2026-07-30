// src/types/collection.ts

import type { Image, CategoryListing, BrandListing } from "@/types/product";

/** Price shape returned by /collection for each product (note the % field) */
export interface CollectionProductPrice {
  actualPrice: number;
  salePrice: number;
  gst: number;
  taxStatus: "Inclusive" | "Exclusive";
  /** API returns discountPercentage (not discountPrice) for collections */
  discountPercentage?: number;
}

export interface CollectionProduct {
  _id: string;
  name: string;
  slug:string;
  images: Image[];
  category: CategoryListing; // API includes more, this is a safe subset
  brand: BrandListing;       // API includes more, this is a safe subset
  price: CollectionProductPrice;
}

export interface Collection {
  _id: string;
  name: string;
  value: number; // % off to show beside Offer Zone
  products: CollectionProduct[];
  status: "Active" | "Inactive";
  position: number;
  createdAt: string;
}

export interface CollectionListResponse {
  success: boolean;
  message: string;
  currentPage: number;
  results: Collection[];
  latestCount: number;
  totalCount: number;
  totalPages: number;
}
