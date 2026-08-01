// src/types/banner.ts

import { Product } from './product';

export interface MediaFile {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
}

export interface BannerCollection extends Product {
  price: {
    discountPercentage: number;
    actualPrice: number;
    salePrice: number;
    gst: number;
    discountPrice: number;
    taxStatus: 'Inclusive' | 'Exclusive';
    collectionDiscount: number;
  };
}

export interface Banner {
  _id: string;
  heading: string;
  subHeading: string;
  tagline: string;
  ctaName: string;
  type: 'Hero' | 'Category' | 'Product';
  collections: BannerCollection[];
  status: 'Active' | 'Inactive';
  visibility: 'Show' | 'Hide';
  position: number;
  mediaFile: MediaFile;
  createdAt: string;
  code: string;
}

export interface BannerListing {
  _id: string;
  heading: string;
  subHeading: string;
  tagline: string;
  ctaName: string;
  type: string;
  mediaFile: MediaFile;
  collectionsCount: number;
  status?: string;
  position?: number;
}

export interface BannerQueryParams {
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive';
}