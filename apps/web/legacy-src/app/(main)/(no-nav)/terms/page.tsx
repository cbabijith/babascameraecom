// app/terms/page.tsx  (or src/app/(main)/terms/page.tsx)
"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function TermsPage() {
  // Typography tokens (matching all other policy pages)
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
              { label: "TERMS AND CONDITIONS" },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <section className="constrained-width">
        {/* Title */}
        <h1 className="text-center text-[24px] sm:text-[30px] font-[700] text-[#E11924] tracking-tight">
          Terms and Conditions
        </h1>

        {/* Last Updated */}
        <p className={`${cCls} mt-6`}>
          <span className="font-[650]">Last Updated:</span>{" "}
          <time dateTime="2025-10-13">13-10-2025</time>
        </p>

        {/* Intro */}
        <p className={`${cCls} mt-8`}>
          Welcome to Babas. By accessing or using our website and services, you
          agree to comply with and be bound by the following Terms &amp;
          Conditions. Please read them carefully before using our website.
        </p>

        {/* Sections */}
        <div className="mt-12 space-y-12 w-full">
          {/* 1. General */}
          <section>
            <h2 className={`${hCls} mb-4`}>1. General</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                By accessing this website, you acknowledge that you have read,
                understood, and agreed to these Terms &amp; Conditions.
              </li>
              <li className={cCls}>
                Babas reserves the right to modify these terms at any time. Any
                changes will be posted on this page, and continued use of the
                site will constitute acceptance of the revised terms.
              </li>
            </ul>
          </section>

          {/* 2. Product Information */}
          <section>
            <h2 className={`${hCls} mb-4`}>2. Product Information</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                We strive to ensure that all product details, descriptions, and
                prices are accurate.
              </li>
              <li className={cCls}>
                However, Babas is not liable for typographical errors,
                inaccuracies, or omissions that may relate to product
                descriptions, pricing, or availability.
              </li>
              <li className={cCls}>
                We reserve the right to correct errors and update product
                information at any time without prior notice.
              </li>
            </ul>
          </section>

          {/* 3. Pricing & Availability */}
          <section>
            <h2 className={`${hCls} mb-4`}>3. Pricing &amp; Availability</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                All prices are subject to change without prior notice.
              </li>
              <li className={cCls}>
                Product availability cannot be guaranteed and will be confirmed
                only at checkout.
              </li>
              <li className={cCls}>
                In case of an error in pricing, we reserve the right to cancel
                the order and issue a refund if payment has already been made.
              </li>
            </ul>
          </section>

          {/* 4. Payment Terms */}
          <section>
            <h2 className={`${hCls} mb-4`}>4. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Orders are considered valid only after successful payment
                authorization.
              </li>
              <li className={cCls}>
                We accept payment through approved payment gateways displayed at
                checkout.
              </li>
              <li className={cCls}>
                In case of failed or unauthorized transactions, the order will
                not be processed.
              </li>
            </ul>
          </section>

          {/* 5. Use of Website */}
          <section>
            <h2 className={`${hCls} mb-4`}>5. Use of Website</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                You agree to use this website only for lawful purposes.
              </li>
              <li className={`${cCls} space-y-2`}>
                You must not engage in:
                <ul className="list-disc pl-6 space-y-2">
                  <li className={cCls}>Fraudulent activities</li>
                  <li className={cCls}>Hacking or attempts to breach security</li>
                  <li className={cCls}>
                    Unauthorized transactions or misuse of payment methods
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 6. Limitation of Liability */}
          <section>
            <h2 className={`${hCls} mb-4`}>6. Limitation of Liability</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                Babas shall not be held responsible for any indirect,
                incidental, or consequential damages arising out of the use or
                inability to use our products or services.
              </li>
              <li className={cCls}>
                Our liability is limited to the maximum extent permitted by law.
              </li>
            </ul>
          </section>

          {/* 7. Governing Law & Jurisdiction */}
          <section>
            <h2 className={`${hCls} mb-4`}>
              7. Governing Law &amp; Jurisdiction
            </h2>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>
                These Terms &amp; Conditions are governed by the laws of India.
              </li>
              <li className={cCls}>
                All disputes are subject exclusively to the jurisdiction of the
                courts in Thiruvananthapuram, Kerala, India.
              </li>
            </ul>
          </section>

          {/* 8. Contact Us */}
          <section>
            <h2 className={`${hCls} mb-4`}>8. Contact Us</h2>
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
