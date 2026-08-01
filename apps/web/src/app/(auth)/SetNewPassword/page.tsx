// src/app/(auth)/SetNewPassword/page.tsx
import { Suspense } from "react";
import SetNewPasswordForm from "@/components/auth/setNewPasswordForm";

export default function SetNewPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <SetNewPasswordForm />
    </Suspense>
  );
}
