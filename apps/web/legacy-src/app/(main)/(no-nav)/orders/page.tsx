// app/orders/page.tsx
import OrdersView from "@/components/orders/OrdersView";

export const metadata = {
  title: "Your Orders",
};

export default function OrdersPage() {
  return <OrdersView />;
}
