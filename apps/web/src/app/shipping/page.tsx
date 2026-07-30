import { InfoPage } from "@/components/content/info-page";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <InfoPage
      eyebrow="Delivery"
      title="Shipping information"
      introduction="Delivery charges and free-shipping eligibility are calculated from the current store rules and confirmed during checkout."
      sections={[
        {
          title: "Dispatch and tracking",
          body: "After an order is prepared and dispatched, its carrier and tracking link appear in your account when available. Delivery timing depends on destination, stock and carrier service.",
        },
        {
          title: "Packaging and address checks",
          body: "Equipment is packed for transit. Please provide a complete address and reachable phone number; incorrect or incomplete delivery details can delay dispatch.",
        },
        {
          title: "Need help?",
          body: "Use the contact page with your order number for a delivery-status question.",
        },
      ]}
    />
  );
}
