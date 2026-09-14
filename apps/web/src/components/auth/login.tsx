"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/slice/authSlice";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, LockKeyhole, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginUser } from "@/instances/authInstance";
import { toast } from "sonner";
import type { User } from "@/types/auth";

// Orbit decoration constants & component (unchanged)

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 533.5 544.3"
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M533.5 278.4c0-18.6-1.6-37-5-54.8H272v103.9h147.6c-6.4 34.6-25.8 64-55 83.6v69.4h88.7c52-47.9 80.2-118.4 80.2-202.1z"
        fill="#4285F4"
      />
      <path
        d="M272 544.3c73.4 0 135-24.1 180-65.7l-88.7-69.4c-24.4 16.6-55.9 26-91.3 26-70.1 0-129.5-47.3-150.8-111H30.4v71.6A271.8 271.8 0 00272 544.3z"
        fill="#34A853"
      />
      <path
        d="M121.2 324.2c-5.4-16.1-8.5-33.3-8.5-52.2s3.1-36.1 8.5-52.2V148.2H30.4A271.8 271.8 0 000 272c0 43.8 10.5 85.3 30.4 123.8l90.8-71.6z"
        fill="#FBBC05"
      />
      <path
        d="M272 107.7c39.9 0 75.7 13.7 104 40.4l78.2-78.2C406.8 24.5 345.2 0 272 0 162.2 0 68 62.4 30.4 148.2l90.8 71.6C142.5 155 201.9 107.7 272 107.7z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GoogleButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Sign in with Google"
      className={cn(
        // layout
        "relative group inline-flex w-full items-center justify-center gap-3 rounded-lg",
        "px-4 py-2.5 text-sm font-medium",

        // surface & border
        "bg-white text-gray-800 border border-[#dbd5d5] cursor-pointer",

        // **subtle layered shadow** (base)
        "shadow-[0_1px_2px_rgba(16,24,40,0.08),0_4px_10px_rgba(16,24,40,0.08)]",

        // hover = tiny lift + slightly stronger shadow
        "hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(16,24,40,0.12),0_2px_6px_rgba(16,24,40,0.06)]",

        // active = press down + tighter shadow
        "active:translate-y-0 active:shadow-[0_1px_3px_rgba(16,24,40,0.18)]",

        // focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",

        // disabled
        "disabled:opacity-60 disabled:cursor-not-allowed",

        // **soft ambient glow underneath** (keeps it ‘floating’)
        "after:pointer-events-none after:absolute after:inset-x-6 after:-bottom-2 after:h-2 after:rounded-full",
        "after:bg-black/10 after:blur-md after:content-[''] group-hover:after:bg-black/15"
      )}
    >
      <span className="grid place-items-center rounded bg-white">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : <GoogleIcon />}
      </span>
      <span className="truncate">{loading ? "Signing in..." : "Sign in with Google"}</span>
      {/* right ghost spacer to keep text centered */}
      <span className="w-5" />
    </button>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  interface LoginResult { token: string; user: User | null }

  React.useEffect(() => {
    setGoogleLoading(false);
    const handlePageShow = (_event: PageTransitionEvent) => {
      setGoogleLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (
      errorParam === "account_disabled" ||
      errorParam === "account-disabled" ||
      errorParam === "disabled"
    ) {
      toast.error("Your account has been disabled. Please contact support.");
    } else if (errorParam === "account_not_linked") {
      toast.error("Could not link account automatically. Please try again.");
    } else if (errorParam === "oauth") {
      toast.error("Google sign-in failed. Please try again.");
    } else if (errorParam) {
      toast.error("Authentication error. Please try signing in again.");
    }

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Server-side OAuth: POST to better-auth's /sign-in/social (it sets the
  // CSRF state cookie), then follow the Google authorization URL it returns.
  // The callback at /api/auth/callback/google creates the session and returns
  // the user to `next`.
  async function handleGoogleLogin() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/profile";
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: next }),
      });
      if (!res.ok) {
        setGoogleLoading(false);
        const text = await res.text().catch(() => "");
        let msg = "Could not start Google sign-in. Please try again.";
        try {
          msg = JSON.parse(text)?.message || msg;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setGoogleLoading(false);
        toast.error("Could not start Google sign-in. Please try again.");
      }
    } catch {
      setGoogleLoading(false);
      toast.error("Could not start Google sign-in. Please try again.");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    // Email validation
    if (!email.trim()) {
      const msg = "Email is required.";
      setEmailError(msg);
      toast.error(msg);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const msg = "Invalid email format.";
      setEmailError(msg);
      toast.error(msg);
      return;
    }

    // Password validation
    if (!password) {
      const msg = "Password is required.";
      setPasswordError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const tp = toast.promise<LoginResult>(loginUser({ email, password }), {
        loading: "Signing you in...",
        success: (res) =>
          `Logged In..${res.user?.name ? `, ${res.user.name}` : ""}!`,
        error: (err: unknown) =>
          err instanceof Error
            ? err?.message
            : "Login failed. Please try again.",
      });

      const { user } = await tp.unwrap();

      if (user) {
        dispatch(setUser({ ...user, name: user.name ?? "" }));
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      router.replace(next || "/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";

      setError(message);

      // Map backend error to specific field or toast
      if (message.toLowerCase().includes("disabled")) {
        toast.error(message);
      } else if (message.toLowerCase().includes("password")) {
        setPasswordError(message);
      } else if (message.toLowerCase().includes("email")) {
        setEmailError(message);
      }

      // Only show toast if neither field error nor disabled toast was set
      if (
        !message.toLowerCase().includes("password") &&
        !message.toLowerCase().includes("email") &&
        !message.toLowerCase().includes("disabled")
      ) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
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

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* LEFT: Login Form */}
        <div className="relative flex items-center justify-center px-[10px] md:px-0">
          <div className="w-[450px] p-[16px] lg:p-0">
            <Card className="w-full border-0 shadow-none">
              <CardContent className="p-0">
                <form
                  className="flex w-full flex-col items-center"
                  noValidate
                  onSubmit={onSubmit}
                >
                  {/* Header */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-[8px] border border-[#E4E4E7] rounded-[8px]">
                      <Image
                        src="/loginImg.svg"
                        alt="users Logo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <h1 className="text-[16px] lg:text-[20px] font-semibold text-[#000000]">
                      Login to your account
                    </h1>
                    <p className="font-[400] text-[12px] lg:text-[14px] text-[#475569]">
                      Welcome back, Please enter your details
                    </p>
                  </div>

                  {/* (Removed the earlier Google section from here) */}

                  {/* Fields */}
                  <div className=" w-full mt-8 flex flex-col gap-[20px]">
                    {/* Email */}
                    <div className="w-full space-y-2">
                      <Label className="text-[14px] text-[#09090B]">
                        Email Id <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@website.com"
                          required
                          className={cn(
                            "pl-10 text-[14px] placeholder:text-[14px]",
                            emailError && "border-red-500 focus:ring-red-500"
                          )}
                          aria-invalid={!!emailError}
                        />
                      </div>
                      {emailError && (
                        <p className="text-xs text-red-600">{emailError}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="w-full space-y-2">
                      <Label className="text-[14px] text-[#09090B]">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className={cn(
                            "pl-10 pr-10 text-[14px] placeholder:text-[14px]",
                            passwordError && "border-red-500 focus:ring-red-500"
                          )}
                          placeholder="********"
                          aria-invalid={!!passwordError}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-xs text-red-600">{passwordError}</p>
                      )}
                      <div className="mt-1 text-right">
                        <Link
                          href="/verify-email"
                          className="text-[10px] lg:text-[12px] font[500] text-[#0D1DC6] hover:underline hover:text-blue-600"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(16,24,40,0.12),0_2px_6px_rgba(16,24,40,0.06)] my-[24px] text-[#FAFAFA] h-10 w-full bg-[#0E1623] hover:bg-[#0b1120] text-[14px] font-[500] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>

                  <div className="relative mb-6 w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs font-medium text-muted-foreground">
                      <span className="bg-background px-2">Or continue with</span>
                    </div>
                  </div>


                 <div className="w-full mb-4">
                  <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />
                </div>


                  {/* Create account */}
                  <p className="text-center text-[12px] text-[#000000]">
                    Not registered yet?{" "}
                    <Link
                      href="/signUp"
                      className="text-[#0D1DC6] hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

     {/* RIGHT: Static Orbit Illustration */}
<div className="relative hidden md:flex w-full h-full items-center justify-center overflow-hidden">
  <Image
    src="/Orbit.svg"
    alt="Orbit Illustration"
    width={800}
    height={800}
    className="object-contain max-w-[90%] h-auto"
    priority
  />
</div>
      </div>
    </div>
  );
}
