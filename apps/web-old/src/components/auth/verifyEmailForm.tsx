"use client";
import React, { useState } from "react";
import Image from "next/image";
import {
  Mail,
  LockKeyhole,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword } from "@/instances/authInstance";
import { useRouter } from "next/navigation";

export default function VerifyEmailForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter(); // ⬅️ add

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // const handleSendOTP = async () => {
  //   // Reset states
  //   setError("");
  //   setSuccess("");

  //   // Validation
  //   if (!email.trim()) {
  //     setError("Email is required");
  //     return;
  //   }

  //   if (!validateEmail(email)) {
  //     setError("Please enter a valid email address");
  //     return;
  //   }

  //   setIsLoading(true);

  //   try {
  //     const message = await forgotPassword({ email: email.trim() });
  //     setSuccess(message);
  //     setEmailSent(true);
  //   } catch (err: unknown) {
  //   const msg =
  //     err instanceof Error
  //       ? err.message
  //       : "Failed to send OTP. Please try again.";
  //   setError(msg);
  // } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSendOTP = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) return setError("Email is required");
    if (!validateEmail(email))
      return setError("Please enter a valid email address");

    setIsLoading(true);
    try {
      // Option A: plain
      const message = await forgotPassword({ email: email.trim() });

      // Option B: with toast
      // await toast.promise(forgotPassword({ email: email.trim() }), {
      //   loading: "Sending code...",
      //   success: "Verification code sent to your email.",
      //   error: (e:any) => e?.message || "Failed to send OTP.",
      // });

      setSuccess(message);

      // (optional) keep email for refresh safety
      if (typeof window !== "undefined") {
        sessionStorage.setItem("otpEmail", email.trim());
      }

      // 👉 redirect to OTP page and pass email
      router.replace(
        `/verificationCode?email=${encodeURIComponent(email.trim())}`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send OTP. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setEmailSent(false);
    setSuccess("");
    await handleSendOTP();
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

      {/* Grid: 1 col on mobile/tablet; 2 cols on desktop */}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT: card */}
        <div className="relative flex items-center justify-center px-[10px] lg:px-0">
          <div className="w-[450px]">
            <div className="rounded-2xl p-6 md:p-8 relative z-10 bg-transparent">
              <div className="flex w-full flex-col items-center gap-[40px]">
                {/* Icon block */}
                <div className="p-[8px] border border-[#E4E4E7] rounded-[8px]">
                  {emailSent ? (
                    <CheckCircle className="w-[24px] h-[24px] text-green-600" />
                  ) : (
                    <LockKeyhole className="w-[24px] h-[24px] text-gray-600" />
                  )}
                </div>

                {/* Title */}
                <div className="text-center">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    {emailSent ? "Check Your Email" : "Verify Your Email"}
                  </h1>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {emailSent ? (
                      <>
                        We&lsquo;ve sent a verification code to
                        <br />
                        <span className="font-medium">{email}</span>
                      </>
                    ) : (
                      <>
                        We will send a verification number to
                        <br />
                        your registered email.
                      </>
                    )}
                  </p>
                </div>
{/* 
                <div className="block lg:hidden">
                  <div className="fixed z-0">
                    <div className="relative aspect-[534/458] ">
                      <Image
                        src="/emailVer.png"
                        alt="Email Verification Illustration"
                        width={180}
                        height={155}
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                </div> */}

                {/* Success Message */}
                {success && (
                  <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email field - only show if email hasn't been sent yet */}
                {!emailSent && (
                  <div className="w-full space-y-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Email Id <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          // Clear error when user starts typing
                          if (error) setError("");
                        }}
                        placeholder="name@website.com"
                        className="pl-10 h-11"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="w-full space-y-3">
                  {!emailSent ? (
                    <Button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isLoading || !email.trim()}
                      className="w-full h-11 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Sending OTP...
                        </>
                      ) : (
                        "Send OTP"
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-center text-sm text-gray-600">
                        Didn&lsquo;t receive the code?
                      </p>
                      <Button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full h-11 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Resending...
                          </>
                        ) : (
                          "Resend Code"
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Back to login link */}
                {emailSent && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSent(false);
                        setSuccess("");
                        setError("");
                        setEmail("");
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 underline transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: illustration */}
        <div className="hidden lg:block">
          <div className="fixed right-[clamp(72px,8vw,120px)] bottom-[clamp(20px,3vh,30px)] z-0">
            <div className="relative aspect-[534/458] w-[clamp(360px,32vw,534.205px)]">
              <Image
                src="/emailVer.png"
                alt="Email Verification Illustration"
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
