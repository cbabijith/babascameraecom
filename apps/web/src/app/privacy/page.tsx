import { InfoPage } from "@/components/content/info-page";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="How shopping data is used"
      introduction="We process the information needed to run the store, fulfil orders, prevent misuse and provide customer support."
      sections={[
        {
          title: "Information processed",
          body: "This can include account details, contact and delivery information, cart and order records, support messages and payment-provider references. Card and UPI credentials are handled by the payment provider, not stored by this storefront.",
        },
        {
          title: "Why it is used",
          body: "Information is used for checkout, fulfilment, order communication, security, accounting and legal obligations. Newsletter email is used only after subscription and can be unsubscribed.",
        },
        {
          title: "Service providers and requests",
          body: "Necessary information may be shared with infrastructure, payment, email and delivery providers. Contact Baba's Camera to ask about access, correction or another applicable privacy request.",
        },
      ]}
    />
  );
}
