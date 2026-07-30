import Link from "next/link";
import { InfoPage } from "@/components/content/info-page";

export const metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Order support"
      title="Returns and order issues"
      introduction="Return eligibility depends on the product, its condition and the reason for the request. Contact us promptly so the team can review the order."
      sections={[
        {
          title: "Before sending anything",
          body: "Do not ship a product back without return instructions. Keep the original box, accessories, manuals and invoice, and avoid further use while the request is reviewed.",
        },
        {
          title: "Damaged, incorrect or incomplete delivery",
          body: "Photograph the parcel and contents when you discover an issue, preserve all packaging and contact support with the order number and clear details.",
        },
        {
          title: "Start a request",
          body: (
            <>
              Visit the{" "}
              <Link href="/contact" className="font-semibold text-[#E94560]">
                contact page
              </Link>{" "}
              and include your order number. The team will confirm eligibility
              and the next steps.
            </>
          ),
        },
      ]}
    />
  );
}
