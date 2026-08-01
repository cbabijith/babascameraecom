// types/wishlist.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  rating?: number;
  reviews?: number;
}

export interface WishlistItem {
  id: string;
  product: Product;
  addedAt: Date;
}

export interface Category {
  id: string;
  label: string;
  href: string;
  count?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  name: string;
  href: string;
  icon: React.ReactNode;
}

// Component Props Types
export interface ProductCategoriesNavProps {
  categories?: Category[];
  activeCategory?: string;
  className?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

export interface FooterProps {
  sections?: FooterSection[];
  socialLinks?: SocialLink[];
  className?: string;
}

export interface WishlistProps {
  items: WishlistItem[];
  onRemoveItem?: (itemId: string) => void;
  onAddToCart?: (productId: string) => void;
}
