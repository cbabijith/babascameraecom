// app/return-policy/page.tsx   (or src/app/(main)/return-policy/page.tsx)
"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function ReturnRefundPolicy() {
  // Typography tokens (matching privacy & cancellation pages)
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
              { label: "RETURN & REFUND POLICY" },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <section className="constrained-width">
        {/* Title */}
        <h1 className="text-center text-[24px] sm:text-[30px] font-[700] text-[#E11924] tracking-tight">
          Return &amp; Refund Policy
        </h1>

        {/* Last Updated */}
        <p className={`${cCls} mt-6`}>
          <span className="font-[650]">Last Updated:</span>{" "}
          <time dateTime="2025-10-13">13-10-2025</time>
        </p>

        {/* Intro */}
        <p className={`${cCls} mt-8`}>
          At Babas Camera Scan, we want you to be completely satisfied with your
          purchase. If you are not satisfied, the following Return &amp; Refund
          Policy applies:
        </p>

        <div className="mt-12 space-y-12 w-full">
          {/* 1. Eligibility */}
          <section>
            <h2 className={`${hCls} mb-4`}>1. Eligibility for Return</h2>
            <p className={`${cCls} mb-4`}>
              Products can be returned within 7 days of delivery only if they
              are:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>Defective</li>
              <li className={cCls}>Damaged</li>
              <li className={cCls}>Not as described on our website</li>
            </ul>
          </section>

          {/* 2. Non-Returnable */}
          <section>
            <h2 className={`${hCls} mb-4`}>2. Non-Returnable Items</h2>
            <p className={`${cCls} mb-4`}>
              The following items are not eligible for return or refund:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>Batteries</li>
              <li className={cCls}>Memory cards</li>
              <li className={cCls}>Software and licenses</li>
              <li className={cCls}>Consumables</li>
              <li className={cCls}>Products purchased under clearance/sale</li>
            </ul>
          </section>

          {/* 3. Return Process */}
          <section>
            <h2 className={`${hCls} mb-4`}>3. Return Process</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Contact us at{" "}
                <a
                  href="mailto:photostore@babas.in"
                  className="text-[#E11924] underline-offset-2 hover:underline"
                >
                  photostore@babas.in
                </a>{" "}
                with your order details and proof (photos/videos).
              </li>
              <li className={cCls}>
                Our team will verify and approve the return request.
              </li>
              <li className={cCls}>
                Once approved, customers must ship the product back in its
                original packaging, including all:
                <ul className="list-disc pl-6 mt-3 space-y-2">
                  <li className={cCls}>Accessories</li>
                  <li className={cCls}>Manuals</li>
                  <li className={cCls}>Invoice</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 4. Refunds */}
          <section>
            <h2 className={`${hCls} mb-4`}>4. Refunds</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                After the returned product is received and inspected, we will
                notify you of the status.
              </li>
              <li className={cCls}>
                Approved refunds will be initiated within 7–10 business days via
                the original payment method.
              </li>
              <li className={cCls}>
                Shipping and handling charges are non-refundable unless the
                return is due to our error.
              </li>
            </ul>
          </section>

          {/* 5. Exchange Policy */}
          <section>
            <h2 className={`${hCls} mb-4`}>5. Exchange Policy</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Exchanges are allowed subject to stock availability.
              </li>
              <li className={cCls}>
                If the replacement product is not available, a refund will be
                issued instead.
              </li>
            </ul>
          </section>

          {/* 6. Contact */}
          <section>
            <h2 className={`${hCls} mb-4`}>6. Contact Us</h2>
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

      {/* Spacer to push footer down on tall screens */}
      <div className="h-28 sm:h-36" />
    </main>
  );
}
