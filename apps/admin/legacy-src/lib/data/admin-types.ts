export type DecimalString = string;

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  mrp: DecimalString;
  salePrice: DecimalString;
  stock: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isActive: boolean;
  categoryName: string;
  brandName: string;
  primaryImageUrl: string | null;
  updatedAt: string;
};

export type ProductVariantItem = {
  id: string;
  name: string;
  value: string;
  sku: string;
  additionalPrice: DecimalString;
  stock: number;
};

export type ProductImageItem = {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  shortDescription: string | null;
  categoryId: string;
  brandId: string;
  costPrice: DecimalString | null;
  weight: DecimalString | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: ProductVariantItem[];
  images: ProductImageItem[];
};

export type CatalogOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type CategoryListItem = CatalogOption & {
  parentId: string | null;
  parentName: string | null;
  imageUrl: string | null;
  description: string | null;
  productCount: number;
};

export type BrandListItem = CatalogOption & {
  logoUrl: string | null;
  description: string | null;
  productCount: number;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentMethod: "razorpay" | "cod";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  total: DecimalString;
  createdAt: string;
  updatedAt: string;
};

export type OrderItemView = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPrice: DecimalString;
  total: DecimalString;
};

export type OrderHistoryView = {
  id: string;
  fromStatus: OrderListItem["status"] | null;
  toStatus: OrderListItem["status"];
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type RefundView = {
  id: string;
  amount: DecimalString;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  reason: string | null;
  providerRefundId: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type ShippingAddress = {
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type OrderDetail = OrderListItem & {
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  subtotal: DecimalString;
  discount: DecimalString;
  shippingCharge: DecimalString;
  notes: string | null;
  shippingAddress: ShippingAddress;
  items: OrderItemView[];
  history: OrderHistoryView[];
  refunds: RefundView[];
};

export type CustomerListItem = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  orderCount: number;
  lifetimeValue: DecimalString;
  createdAt: string;
};

export type CustomerDetail = CustomerListItem & {
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
  }>;
  orders: OrderListItem[];
  reviews: ReviewListItem[];
};

export type CouponListItem = {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: DecimalString;
  minOrderAmount: DecimalString;
  maxDiscount: DecimalString | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type ReviewListItem = {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  createdAt: string;
};

export type SettingListItem = {
  id: string;
  key: string;
  value: unknown;
  label: string | null;
  group: string;
  updatedAt: string;
};

export type DashboardData = {
  metrics: {
    revenue: DecimalString;
    orders: number;
    pendingOrders: number;
    customers: number;
    activeProducts: number;
    lowStockProducts: number;
    pendingReviews: number;
  };
  chart: Array<{ label: string; revenueMinor: number; orders: number }>;
  recentOrders: OrderListItem[];
  lowStock: ProductListItem[];
};

