
export interface DeliveryAddress {
  _id?: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface CheckoutItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    category: {
      name: string;
    };
    brand: {
      name: string;
    };
    price: {
      salePrice: number;
      originalPrice?: number;
    };
    images: Array<{
      key: string;
      url?: string;
    }>;
    code?: string;
  };
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CheckoutSummary {
  itemsTotal: number;
  deliveryFee: number;
  gst: number;
  total: number;
  itemCount: number;
}

export interface CheckoutState {
  items: CheckoutItem[];
  deliveryAddress: DeliveryAddress | null;
  loading: boolean;
  error: string | null;
}

// Component Props Types
export interface CheckoutPageProps {
  initialItems?: CheckoutItem[];
  initialAddress?: DeliveryAddress;
}

export interface DeliveryAddressCardProps {
  address: DeliveryAddress | null;
  onAddAddress: () => void;
  onEditAddress: () => void;
}

export interface CheckoutItemCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  features: string[];
  inStock?: boolean;
  className?: string;
}

export interface CheckoutSummaryProps {
  itemsTotal: number;
  deliveryFee: number;
  gst: number;
  total: number;
  itemCount: number;
  onPlaceOrder: () => void;
  isOrderDisabled?: boolean;
}

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: DeliveryAddress) => void;
  initialAddress?: DeliveryAddress;
  title?: string;
}