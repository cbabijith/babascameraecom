import { InfoPage } from "@/components/content/info-page";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Store terms"
      title="Terms of purchase and use"
      introduction="By using this storefront or placing an order, you agree to provide accurate information and use the service lawfully."
      sections={[
        {
          title: "Products, pricing and orders",
          body: "Availability, price and promotions are checked again when an order is placed. An order may be cancelled or refunded if payment, stock, pricing, address or fraud checks cannot be completed.",
        },
        {
          title: "Payment and delivery",
          body: "Online payments are processed by Razorpay. Eligible orders may offer cash on delivery. Delivery estimates are not guarantees and can be affected by carrier or destination conditions.",
        },
        {
          title: "Acceptable use and support",
          body: "Do not interfere with the service, submit false information or misuse payment and promotion systems. Contact support with an order number for purchase-specific assistance.",
        },
      ]}
    />
  );
}
