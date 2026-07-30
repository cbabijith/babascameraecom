"use client";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/instances/authInstance";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // use your preferred toast
import { getErrorMessage } from "@/lib/apiClient";

export default function SetNewPasswordForm() {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirm) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      await resetPassword(newPassword);
      toast.success("Password reset successfully!");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* Logo */}
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

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT FORM */}
        <div className="relative flex items-center justify-center px-[10px] lg:px-0">
          <div className="w-[450px]">
            <div className="mb-2 text-center">
              <div className="mb-4 flex justify-center">
                <div className="grid size-16 place-items-center rounded-lg border bg-gray-50">
                  <KeyRound className="w-8 h-8 text-gray-600" />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Set New Password
              </h1>
            </div>

            {/* FORM */}
            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              {/* New password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1 block text-sm font-medium text-gray-900"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-base outline-none focus:border-gray-300"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1 block text-sm font-medium text-gray-900"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <LockKeyhole className="h-4 w-4" />
                  </span>
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-md border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-base outline-none focus:border-gray-300"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#0E1623] py-2 px-4 text-sm font-medium text-white hover:bg-[#0b1120] disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="hidden lg:block">
          <div className="fixed right-[clamp(72px,8vw,120px)] bottom-[clamp(20px,3vh,30px)] z-0">
            <div className="relative aspect-[534/458] w-[clamp(360px,32vw,534.205px)]">
              <Image
                src="/system.png"
                alt="Password UI"
                width={717}
                height={448}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* <div className="hidden lg:flex items-center justify-center pr-6">
          <Image
            src="/system.png"
            alt="Password UI"
            width={717}
            height={448}
            className="object-contain"
            priority
          />
        </div> */}
      </div>
    </main>
  );
}
