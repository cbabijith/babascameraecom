import { Suspense } from "react";
import ProfilePageClient from "@/components/profile/ProfilePageClient";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <ProfilePageClient />
    </Suspense>
  );
}
