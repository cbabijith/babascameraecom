export type OrderSummary = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  payment_method: string;
  total_minor: number;
  paid_minor: number;
  refunded_minor: number;
  created_at: string;
  placed_at: string | null;
};

export type OrderItem = {
  id: string;
  product_name: string;
  sku: string;
  brand_name: string | null;
  option_values: Record<string, unknown>;
  quantity: number;
  unit_price_minor: number;
  line_discount_minor: number;
  line_tax_minor: number;
  line_total_minor: number;
};

export type OrderStatusEvent = {
  id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
};

export type PaymentAttempt = {
  id: string;
  order_id: string;
  provider: string;
  method: string;
  status: string;
  amount_minor: number;
  currency?: string;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  failure_code?: string | null;
  failure_description?: string | null;
  created_at: string;
  updated_at?: string;
  captured_at?: string | null;
};

export type OrderDetail = OrderSummary & {
  shipping_address: Record<string, unknown>;
  billing_address: Record<string, unknown>;
  items_subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  tax_minor: number;
  gateway_fee_minor: number;
  customer_note: string | null;
  internal_note: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusEvent[];
  paymentAttempts: PaymentAttempt[];
};

export type ProductSummary = {
  id: string;
  brand_id: string;
  primary_category_id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  key_features: string[];
  specifications: Record<string, unknown>;
  measuring_unit: string;
  payment_eligibility: string;
  status: string;
  visibility: string;
  position: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  brandName: string;
  categoryName: string;
  defaultVariant: VariantSummary | null;
  variantCount: number;
  availableQuantity: number;
};

export type VariantSummary = {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  hsn_code: string | null;
  option_values: Record<string, unknown>;
  color: string | null;
  color_label: string | null;
  price_minor: number;
  compare_at_minor: number | null;
  cost_minor: number | null;
  tax_rate_bps: number;
  tax_mode: string;
  weight_grams: number | null;
  is_default: boolean;
  is_active: boolean;
};

export type ProductMediaSummary = {
  id: string;
  media_id: string;
  media_role: string;
  alt_text: string | null;
  position: number;
  bucket: string;
  object_path: string;
  mime_type: string;
  publicUrl: string;
};

export type CatalogLookup = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  status: string;
  visibility: string;
  position: number;
  created_at: string;
  parent_id?: string | null;
};

export type InventoryEntry = {
  id: string;
  variant_id: string;
  location_id: string;
  on_hand: number;
  reserved: number;
  available_quantity: number;
  low_stock_threshold: number;
  version: number;
  updated_at: string;
  sku: string;
  productName: string;
  locationName: string;
  locationCode: string;
};

export type CustomerSummary = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  customer_type: string;
  account_status: string;
  created_at: string;
  roles: string[];
  orderCount: number;
  spendMinor: number;
};

export type CouponSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  coupon_type: string;
  value: number;
  maximum_discount_minor: number | null;
  minimum_subtotal_minor: number;
  starts_at: string;
  ends_at: string;
  total_usage_limit: number | null;
  per_customer_limit: number;
  is_active: boolean;
  created_at: string;
};

export type BannerSummary = {
  id: string;
  heading: string;
  subheading: string | null;
  tagline: string | null;
  cta_label: string | null;
  cta_href: string | null;
  banner_type: string;
  status: string;
  visibility: string;
  position: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type CollectionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discount_bps: number;
  status: string;
  visibility: string;
  position: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  productCount: number;
  products: { id: string; name: string; position: number }[];
};

export type BankTransferSummary = {
  id: string;
  order_id: string;
  payment_attempt_id: string;
  reference_number: string;
  account_name: string;
  amount_minor: number;
  proof_bucket: string;
  proof_path: string;
  status: string;
  review_note: string | null;
  submitted_at: string;
  orderNumber: string;
  proofUrl: string | null;
};

export type ReturnSummary = {
  id: string;
  order_id: string;
  user_id: string;
  status: string;
  reason: string;
  customer_note: string | null;
  internal_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  orderNumber: string;
  customerName: string;
};

export type RefundSummary = {
  id: string;
  order_id: string;
  payment_attempt_id: string;
  amount_minor: number;
  status: string;
  reason: string;
  provider_refund_id: string | null;
  created_at: string;
  orderNumber: string;
};

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
  actorName: string;
};

export type StoreConfiguration = {
  codEnabled: boolean;
  codMinimumMinor: number;
  codMaximumMinor: number;
  onlinePaymentEnabled: boolean;
  onlinePaymentFeeBps: number;
  bankTransferEnabled: boolean;
  freeShippingEnabled: boolean;
  freeShippingThresholdMinor: number;
  flatShippingMinor: number;
  storeName: string;
  currency: string;
  supportEmail: string;
  supportPhone: string;
};
