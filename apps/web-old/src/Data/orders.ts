// src/types/order.ts
export type OrderStatus = "Placed" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled" | "Returned";

export type OrderItem = {
  product?: { name?: string; images?: { key: string }[] };
  name?: string;
  price?: number;
  bullets?: string[];
  quantity?: number;
};

export type Order = {
  _id: string;
  code: string;
  orderStatus: OrderStatus;
  placedAt?: string;
  createdAt?: string;
  items: OrderItem[];
  summary: {
    items?: number;
    delivery?: number;
    gst?: number;
    total: number;
  };
};
