"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { Lock, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerificationCodeForm() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get email from query params (if passed from previous step)
  const email = searchParams?.get("email");
  console.log(email)

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const next = [...otp];
      next[index] = value;
      setOtp(next);
      if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    const next = [...otp];
    for (let i = 0; i < Math.min(pasted.length, 6); i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

const handleVerify = () => {
  const code = otp.join("");
  if (code.length === 6 && email) {
    router.push(
      `/SetNewPassword?email=${encodeURIComponent(email)}&otp=${code}`
    );
  } else {
    console.error("Email missing or OTP incomplete");
  }
};


  return (
    <main className="relative min-h-screen w-full bg-gray-50 overflow-hidden">
      {/* Logo fixed at top-left */}
     <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10">
             <Image
               src="/PHOTO_STORE_black.svg"
               alt="Babas logo"
               width={80}   // smaller size
               height={80}
               className="object-contain cursor-pointer"
               priority
               onClick={() => router.push("/")}
             />
           </div>

      {/* Grid: 1 col on mobile & tablet; 2 cols on desktop */}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT: card */}
        <div className="relative flex items-center justify-center px-[10px] lg:px-0">
          <div className="w-[450px]">
            <div className="rounded-2xl p-6 md:p-8 relative z-10 bg-transparent">
              <div className="flex w-full flex-col items-center gap-[40px]">
                {/* Icon block */}
                <div className="grid size-12 md:size-14 lg:size-16 place-items-center rounded-lg border bg-gray-50">
                  <Lock className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-gray-600" />
                </div>

                {/* Title */}
                <div className="text-center">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    Enter Verification Code
                  </h1>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Please enter the 6-digit OTP sent to
                    <br />
                    your registered mobile number
                  </p>
                </div>

                {/* OTP Inputs */}
                <div className="w-full">
                  <div className="flex justify-center items-center gap-2 md:gap-3">
                    {otp.map((digit, index) => (
                      <React.Fragment key={index}>
                        <input
                          ref={(el) => {
                            if (el) inputRefs.current[index] = el;
                          }}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          className="w-10 h-12 md:w-12 text-center text-base md:text-lg font-semibold border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          inputMode="numeric"
                        />
                        {index === 2 && <Minus className="w-4 h-4 md:w-5 md:h-5 text-gray-800" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Verify button */}
                <Button
                  type="button"
                  onClick={handleVerify}
                  className="w-full h-11 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={otp.some((d) => !d)}
                >
                  Verify
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: illustration */}
        <div className="hidden lg:block">
          <div className="fixed right-[clamp(72px,8vw,120px)] bottom-[clamp(20px,3vh,30px)] z-0">
            <div className="relative aspect-[534/458] w-[clamp(420px,38vw,740px)]">
              <Image
                src="/password.png"
                alt="Password verification illustration"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
