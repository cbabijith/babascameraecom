// app/shipping/page.tsx   (or src/app/(main)/shipping/page.tsx)
"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function ShippingPolicyPage() {
  // Typography tokens (matching privacy, cancellation, and return pages)
  const hCls =
    "font-[650] not-italic text-[20px] leading-[150%] tracking-[0] text-justify text-black";
  const cCls =
    "font-[400] not-italic text-[16px] leading-[160%] tracking-[0] text-justify text-black";
  const apCls =
    "font-[650] not-italic text-[16px] leading-[150%] tracking-[0] text-justify text-black";

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="constrained-width">
        <div className="py-4 sm:pt-8">
          <AppBreadcrumb
            items={[
              { label: "HOME", href: "/" },
              { label: "SHIPPING & DELIVERY POLICY" },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <section className="constrained-width">
        {/* Title */}
        <h1 className="text-center text-[24px] sm:text-[30px] font-[700] text-[#E11924] tracking-tight">
          Shipping &amp; Delivery Policy
        </h1>

        {/* Last Updated */}
        <p className={`${cCls} mt-6`}>
          <span className="font-[650]">Last Updated:</span>{" "}
          <time dateTime="2025-10-13">13-10-2025</time>
        </p>

        {/* Intro */}
        <p className={`${cCls} mt-8`}>
          At Babas, we aim to ensure that your orders are delivered quickly and
          safely. Please read our Shipping &amp; Delivery Policy to understand
          how we process and deliver your orders.
        </p>

        <div className="mt-12 space-y-12 w-full">
          {/* 1. Coverage */}
          <section>
            <h2 className={`${hCls} mb-4`}>1. Coverage</h2>
            <p className={cCls}>
              We currently ship across India through our trusted courier
              partners.
            </p>
          </section>

          {/* 2. Dispatch Time */}
          <section>
            <h2 className={`${hCls} mb-4`}>2. Dispatch Time</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Orders are processed and dispatched within{" "}
                <b>24–48 hours</b> of payment confirmation.
              </li>
              <li className={cCls}>
                Orders placed on weekends or public holidays will be processed
                on the next working day.
              </li>
            </ul>
          </section>

          {/* 3. Delivery Time */}
          <section>
            <h2 className={`${hCls} mb-4`}>3. Delivery Time</h2>
            <p className={cCls}>
              The estimated delivery time is <b>3–7 business days</b>, depending
              on your location. Remote areas may take slightly longer for
              delivery.
            </p>
          </section>

          {/* 4. Shipping Charges */}
          <section>
            <h2 className={`${hCls} mb-4`}>4. Shipping Charges</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Shipping charges are calculated and displayed at checkout.
              </li>
              <li className={cCls}>
                Free shipping may be applicable on select products, categories,
                or promotional campaigns.
              </li>
            </ul>
          </section>

          {/* 5. Order Tracking */}
          <section>
            <h2 className={`${hCls} mb-4`}>5. Order Tracking</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Once your order is dispatched, you will receive an{" "}
                <b>email and/or SMS</b> with tracking details.
              </li>
              <li className={cCls}>
                Customers can track their orders using the provided tracking
                number on the courier partner’s website.
              </li>
            </ul>
          </section>

          {/* 6. Delays */}
          <section>
            <h2 className={`${hCls} mb-4`}>6. Delays</h2>
            <p className={`${cCls} mb-4`}>
              While we strive to deliver on time, Babas is not responsible for
              delays caused by:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>Courier partner issues</li>
              <li className={cCls}>Natural calamities</li>
              <li className={cCls}>
                Strikes, lockdowns, or unforeseen logistics challenges
              </li>
            </ul>
          </section>

          {/* 7. Contact Us */}
          <section>
            <h2 className={`${hCls} mb-4`}>7. Contact Us</h2>
            <p className={`${cCls} mb-6`}>
              For any questions regarding this policy, please contact us at:
            </p>

            <div className="space-y-5 text-gray-800">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Email:&nbsp;
                  <a
                    href="mailto:photostore@babas.in"
                    className="text-[#E11924] hover:underline"
                  >
                    photostore@babas.in
                  </a>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Phone: +91-471-2572111, +91-9846126000
                </span>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Address: Door No: 71/1393(3-6), Saraswathy Bhavan, Near
                  Overbridge Pazhavangadi, Trivandrum 695036, Kerala, India
                </span>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Spacer to push footer down */}
      <div className="h-28 sm:h-36" />
    </main>
  );
}
