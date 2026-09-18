"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminJson } from "@/lib/api/client";

export function LogoutButton({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const signOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await adminJson<{ redirectTo: string }>(
        "/api/admin/auth/logout",
        { method: "POST", body: {} },
      );
      router.push(result.success ? result.data.redirectTo : "/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-label="Sign out"
      title="Sign out"
      className={className}
    >
      <LogOut className="size-4" />
      {showLabel ? "Sign out" : null}
    </button>
  );
}
