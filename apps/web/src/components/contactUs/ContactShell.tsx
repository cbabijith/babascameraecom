// src/components/ContactShell.tsx
"use client";

import React, { useState } from "react";
import { Phone, Mail, MapPin, Clock, Loader2 } from "lucide-react";
import { sendContact } from "@/instances/contactInstance";
import { toast } from "sonner";

/* Typography: 400 / Regular / 18px / 25px / 0% letter-spacing */
const baseText = "font-normal text-[18px] leading-[25px] tracking-normal";

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="
          mt-1 flex h-10 w-10 flex-none shrink-0 items-center justify-center
          rounded-full text-white aspect-square
        "
        style={{
          border: "2px solid #E72429",
          // slightly lighter gradient + softer shadow
          background: "linear-gradient(168deg, #F04558 8.77%, #FDAF40 91.47%)",
          boxShadow: "0 3px 6px 0 rgba(255, 73, 50, 0.35)",
        }}
      >
        {icon}
      </div>
      <div
        className={`text-black ${baseText}`}
       
      >
        {children}
      </div>
    </div>
  );
}



export default function ContactShell() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!name.trim()) return "Please enter your name.";
    if (!phone.trim()) return "Please enter your phone number.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email.";
    if (!/^[0-9+\-\s()]{7,}$/.test(phone))
      return "Please enter a valid phone number.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    try {
      setSubmitting(true);
      await sendContact({ name, phone, email, message });
      toast.success("Thanks! We’ll get back to you soon.");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to send messsage.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`
        relative isolate mx-auto max-w-[1460px] overflow-visible
        bg-transparent md:bg-white
        md:rounded-[20px]
        md:shadow-[0_20px_60px_rgba(0,0,0,0.12)]
      `}
    >
      {/* MOBILE: top gradient covers ~50% of the viewport height */}
    <div
  className="absolute inset-x-0 top-0 z-[1] md:hidden"
  style={{
    height: "50vh",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    background: "linear-gradient(90deg, #F33F60 0%, #FD9930 100%)",
  }}
/>


      {/* DESKTOP ONLY: white base + 70/30 split (right gradient) */}
      <div className="absolute inset-0 z-[1] hidden md:block rounded-[20px]">
        <div className="absolute inset-0 rounded-[20px] bg-white" />
        <div className="absolute inset-0 grid grid-cols-[70%_30%] rounded-[20px]">
          <div className="rounded-l-[20px] bg-white" />
          <div className="rounded-[0_20px_20px_0] bg-gradient-to-r from-[#FB1F5D] to-[#FC8200]" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-[2]">
        <div className="mx-auto w-full px-4 sm:px-6 md:w-[88%] md:px-0">
          {/* Desktop: 2 cols; Mobile: stacked flow */}
          <div className="flex flex-col md:flex-row md:gap-12 lg:gap-16">
            {/* LEFT COLUMN (desktop) / BELOW FORM CONTENT (mobile) */}
            <div className="flex-1 order-3 md:order-none">
              {/* Desktop heading */}
              <section
                className="hidden md:block p-6 sm:p-8 md:p-12"
               
              >
                <h3 className="text-black font-semibold text-[32px] leading-[38px]">
                  Get in <span className="text-[#E72429]">Touch</span>
                </h3>

                <div className="mt-6 space-y-6">
                  <InfoRow icon={<Phone size={20} />}>
                    <div>
                      <div>+91 471 257 4111,</div>
                      <div>+91 98461 56000</div>
                    </div>
                  </InfoRow>

                  <InfoRow icon={<Mail size={20} />}>
                    <div>
                      <div>enquiry@babas.co,</div>
                      <div>photostore@babas.in</div>
                    </div>
                  </InfoRow>

                  <InfoRow icon={<MapPin size={20} />}>
                    <div>
                      <div className="font-medium">
                        BABA ENTERPRISES PRIVATE LIMITED
                      </div>
                      <div>Door No:38/1623(1-2)</div>
                      <div>Saraswathy Bhavan</div>
                      <div>Near Overbridge Pazhavangadi</div>
                      <div>Trivandrum, Kerala, India – 695036.</div>
                    </div>
                  </InfoRow>
                </div>

                <hr className="my-8 border-gray-200" />

                {/* Business Hours (desktop position) */}
                <section>
                  <h4 className="text-black font-semibold text-[22px] leading-[28px]">
                    Business <span className="text-[#E72429]">Hours</span>
                  </h4>
                  <div className="mt-4">
                    <InfoRow icon={<Clock size={20} />}>
                      <div>
                        <div className="font-medium">Monday to Sunday</div>
                        <div className="text-gray-600">9AM – 9PM</div>
                      </div>
                    </InfoRow>
                  </div>
                </section>
              </section>

              {/* MOBILE: Business Hours (after form) */}
              <section className="md:hidden px-5 sm:px-8 pt-6">
                <h4 className="text-black font-semibold text-[20px] leading-[26px]">
                  Business <span className="text-[#E72429]">Hours</span>
                </h4>
                <div className="mt-3">
                  <InfoRow icon={<Clock size={20} />}>
                    <div>
                      <div className="font-medium">Monday to Sunday</div>
                      <div className="text-gray-600">9AM – 9PM</div>
                    </div>
                  </InfoRow>
                </div>
                <hr className="my-6 border-gray-200" />
              </section>

              {/* MOBILE: Numbers & Email (after hours) */}
              <section className="md:hidden px-5 sm:px-6 pb-8 space-y-6">
                <InfoRow icon={<Phone size={20} />}>
                  <div>
                    <div>+91 471 257 4111,</div>
                    <div>+91 98461 56000</div>
                  </div>
                </InfoRow>

                <InfoRow icon={<Mail size={20} />}>
                  <div>
                    <div>enquiry@babas.co,</div>
                    <div>photostore@babas.in</div>
                  </div>
                </InfoRow>

                <InfoRow icon={<MapPin size={20} />}>
                  <div>
                    <div className="font-medium">
                      BABA ENTERPRISES PRIVATE LIMITED
                    </div>
                    <div>Door No:38/1623(1-2)</div>
                    <div>Saraswathy Bhavan</div>
                    <div>Near Overbridge Pazhavangadi</div>
                    <div>Trivandrum, Kerala, India – 695036.</div>
                  </div>
                </InfoRow>
              </section>
            </div>

            {/* RIGHT COLUMN: FORM */}
            <div className="order-2 md:order-none w-full md:w-[500px] md:ml-16 lg:ml-20">
              {/* MOBILE: Heading appears above the form, inside gradient area */}
              <div className="md:hidden px-5 sm:px-6 pt-6 pb-3">
                <h3 className="text-black font-semibold text-[28px] leading-[34px]">
                  Get in <span className="text-[#E72429]">Touch</span>
                </h3>
              </div>

              {/* Form card:
                  - Mobile: NO white card (transparent, no shadow)
                  - Desktop: white card with shadow, smaller padding/textarea,
                    plus vertical margins to reveal gradient above/below
                */}
             <div className="px-1 sm:px-6 pb-6 md:px-0 md:pb-0">
  <div
    className={[
      "my-6 md:my-10",
      "w-full",                           // <— full width for mobile
      "rounded-[14px] bg-white",
      "p-5 md:p-8 lg:p-9",
      "shadow-[0_10px_24px_rgba(0,0,0,0.10)]", // <— softer shadow
      "ring-1 ring-black/5"
    ].join(" ")}
  >
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
                    <div>
                      <label
                        className={`mb-2 block text-black ${baseText}`}
                       
                      >
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E72429] focus:ring-2 focus:ring-[#E72429]/20 ${baseText}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-black ${baseText}`}
                       
                      >
                        Your Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="Phone number"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E72429] focus:ring-2 focus:ring-[#E72429]/20 ${baseText}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-black ${baseText}`}
                       
                      >
                        Your Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E72429] focus:ring-2 focus:ring-[#E72429]/20 ${baseText}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`mb-2 block text-black ${baseText}`}
                       
                      >
                        Your message
                      </label>
                      <textarea
                        placeholder="Type here....."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className={`
                          w-full resize-none rounded-lg border border-gray-300 px-3 py-3
                          outline-none focus:border-[#E72429] focus:ring-2 focus:ring-[#E72429]/20
                          ${baseText}
                          min-h-[100px] md:min-h-[160px]   /* smaller on desktop to reduce form height */
                        `}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      aria-busy={submitting}
                      className="
                        flex w-full items-center justify-center gap-2
                        rounded-full px-5 py-2 text-[16px] font-semibold text-white
                        bg-[#E72429] hover:bg-[#c81d24]
                        transition-all duration-200 hover:-translate-y-0.5
                        hover:shadow-lg hover:shadow-[#E72429]/40
                        active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70
                      "
                    >
                      {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                      {submitting ? "Sending…" : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
            {/* /RIGHT */}
          </div>
        </div>
      </div>
    </div>
  );
}
