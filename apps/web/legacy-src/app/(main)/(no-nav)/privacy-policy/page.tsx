"use client";
import { Mail, Phone, MapPin } from "lucide-react";
import AppBreadcrumb from "@/components/common/app-breadcrumb";

export default function PrivacyPolicyPage() {
  // Typography tokens
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
            items={[{ label: "HOME", href: "/" }, { label: "PRIVACY POLICY" }]}
          />
        </div>
      </div>

      {/* Main Content */}
      <section className="constrained-width">
        {/* Title */}
        <h1 className="text-center text-[24px] sm:text-[30px] font-[700] text-[#E11924] tracking-tight">
          Privacy Policy
        </h1>

        {/* Effective Date */}
        <p className={`${cCls} mt-6`}>
          <span className="font-[650]">Effective Date:</span>{" "}
          <time dateTime="2025-10-14">October 14, 2025</time>
        </p>

        {/* Intro Paragraph */}
        <p className={`${cCls} mt-8`}>
          At <b>Babascamera.com</b>, your privacy is our top priority. This
          policy explains how we collect, use, and protect your personal
          information when you visit our website or interact with our services.
        </p>

        <div className="mt-12 space-y-12 w-full">
          {/* Information We Collect */}
          <section>
            <h2 className={`${hCls} mb-4`}>Information We Collect</h2>
            <p className={cCls}>
              We collect personal details (name, email, phone, address, payment
              info) to process orders, deliver products, and provide support. We
              may also collect non-personal data such as IP address, browser
              type, and device details for analytics and site improvement.
              Cookies and similar tools help enhance your experience—you can
              manage them in your browser settings.
            </p>
          </section>

          {/* How We Use Your Data */}
          <section>
            <h2 className={`${hCls} mb-4`}>How We Use Your Data</h2>
            <p className={`${cCls} mb-4`}>Your data helps us:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li className={cCls}>Process orders, payments, and deliveries</li>
              <li className={cCls}>
                Communicate updates and offers (with consent)
              </li>
              <li className={cCls}>
                Improve our services and website performance
              </li>
              <li className={cCls}>
                Ensure fraud prevention and security compliance
              </li>
            </ul>
          </section>

          {/* Sharing & Security */}
          <section>
            <h2 className={`${hCls} mb-4`}>Sharing &amp; Security</h2>
            <p className={cCls}>
              You can access, correct, or delete your data anytime and opt out
              of marketing emails. For privacy-related requests, contact{" "}
              <a
                href="mailto:photostore@babas.in"
                className="text-[#E11924] underline-offset-2 hover:underline"
              >
                photostore@babas.in
              </a>
              . We respond within 15 working days.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className={`${hCls} mb-4`}>Your Rights</h2>
            <p className={cCls}>
              You can access, correct, or delete your data anytime and opt out
              of marketing emails. For privacy-related requests, contact{" "}
              <a
                href="mailto:photostore@babas.in"
                className="text-[#E11924] underline-offset-2 hover:underline"
              >
                photostore@babas.in
              </a>
              . We respond within 15 working days.
            </p>
          </section>

          {/* Retention & Children’s Privacy */}
          <section>
            <h2 className={`${hCls} mb-4`}>
              Retention &amp; Children’s Privacy
            </h2>
            <p className={cCls}>
              We retain your information as long as needed for legal and
              operational reasons. Our services are intended for users aged 18
              and above; we don’t knowingly collect data from minors.
            </p>
          </section>

          {/* Policy Updates */}
          <section>
            <h2 className={`${hCls} mb-4`}>Policy Updates</h2>
            <p className={cCls}>
              We may update this policy periodically. The latest version will
              always be available here with an updated effective date.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className={`${hCls} mb-4`}>7. Contact Us</h2>
            <p className={`${cCls} mb-6`}>
              For any questions regarding this policy, please contact us at:
            </p>

            <div className="space-y-5 text-gray-800">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 mt-[2px] text-[#E11924]" />
                <span className={apCls}>
                  Email:&nbsp;
                  <a
                    href="mailto:photostore@babas.in"
                    className="text-[#E11924] underline-offset-2 hover:underline"
                  >
                    photostore@babas.in
                  </a>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 mt-[2px] text-[#E11924]" />
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

      {/* Spacer */}
      <div className="h-28 sm:h-36" />
    </main>
  );
}
