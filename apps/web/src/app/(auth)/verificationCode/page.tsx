import { Suspense } from "react";
import VerificationCodeForm from "@/components/auth/verificationCodeForm";

export default function VerificationCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <VerificationCodeForm />
    </Suspense>
  );
}
