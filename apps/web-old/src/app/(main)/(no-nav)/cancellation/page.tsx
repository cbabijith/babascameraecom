// app/cancellation/page.tsx   (or src/app/(main)/cancellation/page.tsx)
"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function CancellationPolicyPage() {
  // Typography tokens (match privacy policy)
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
            items={[{ label: "HOME", href: "/" }, { label: "CANCELLATION POLICY" }]}
          />
        </div>
      </div>

      {/* Main Content */}
      <section className="constrained-width">
        {/* Title */}
        <h1 className="text-center text-[24px] sm:text-[30px] font-[700] text-[#E11924] tracking-tight">
          Cancellation Policy
        </h1>

        {/* Last Updated */}
        <p className={`${cCls} mt-6`}>
          <span className="font-[650]">Last Updated:</span>{" "}
          <time dateTime="2025-10-13">13-10-2025</time>
        </p>

        {/* Intro */}
        <p className={`${cCls} mt-8`}>
          At Babas, we understand that sometimes you may need to cancel an order. Please read our
          cancellation policy carefully.
        </p>

        <div className="mt-12 space-y-12 w-full">
          {/* 1. Order Cancellation */}
          <section>
            <h2 className={`${hCls} mb-4`}>1. Order Cancellation</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Orders can be cancelled <b>before shipment only</b>.
              </li>
              <li className={cCls}>
                Once an order has been shipped, cancellation is not possible. However, you may request a
                return under our{" "}
                <Link href="/return-policy" className="text-[#E11924] underline-offset-2 hover:underline">
                  Return &amp; Refund Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 2. Refund for Cancelled Orders */}
          <section>
            <h2 className={`${hCls} mb-4`}>2. Refund for Cancelled Orders</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                If an order is cancelled before shipping, a full refund will be issued.
              </li>
              <li className={cCls}>
                Refunds will be processed within 7 business days via the <b>original payment method</b>.
              </li>
            </ul>
          </section>

          {/* 3. How to Request a Cancellation */}
          <section>
            <h2 className={`${hCls} mb-4`}>3. How to Request a Cancellation</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                To cancel your order, please contact us at{" "}
                <a href="mailto:photostore@babas.in" className="text-[#E11924] hover:underline">
                  photostore@babas.in
                </a>{" "}
                with your order details.
              </li>
              <li className={cCls}>
                Our team will confirm whether your order is eligible for cancellation.
              </li>
            </ul>
          </section>

          {/* 4. Exceptions */}
          <section>
            <h2 className={`${hCls} mb-4`}>4. Exceptions</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Orders placed during clearance sales, special promotions, or limited-stock campaigns may{" "}
                <b>not be eligible for cancellation</b>.
              </li>
              <li className={cCls}>
                In such cases, only returns (if applicable) will be considered under our{" "}
                <Link href="/return-policy" className="text-[#E11924] underline-offset-2 hover:underline">
                  Return &amp; Refund Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 5. Contact Us */}
          <section>
            <h2 className={`${hCls} mb-4`}>5. Contact Us</h2>
            <p className={`${cCls} mb-6`}>
              For any questions regarding this policy, please contact us at:
            </p>

            <div className="space-y-5 text-gray-800">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Email:&nbsp;
                  <a href="mailto:photostore@babas.in" className="text-[#E11924] hover:underline">
                    photostore@babas.in
                  </a>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>Phone: +91-471-2572111, +91-9846126000</span>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Address: Door No: 71/1393(3-6), Saraswathy Bhavan, Near Overbridge Pazhavangadi,
                  Trivandrum 695036, Kerala, India
                </span>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Spacer to push footer on tall screens */}
      <div className="h-28 sm:h-36" />
    </main>
  );
}
