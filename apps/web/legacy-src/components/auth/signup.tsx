"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/slice/authSlice";
import {
  registerUser,
  signInWithGoogle,
} from "@/instances/authInstance";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Input } from "@/components/ui/input"; // ← shadcn-style input
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { User } from "@/types/auth";
import { Loader2 } from "lucide-react";

const ORBIT_ICON_SIZE = 70;

const MAX_EMAIL = 254; // RFC-ish practical limit
const MAX_PASS = 64; // plenty for bcrypt/argon2

function OrbitImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={ORBIT_ICON_SIZE}
      height={ORBIT_ICON_SIZE}
      className={cn("absolute object-contain", className)}
      priority
    />
  );
}

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
        d="M272 544.3c74.7 0 137.5-24.7 183.3-67.3l-88.7-69.4c-24.6 16.5-56.1 26.2-94.6 26.2-72.6 0-134.1-49-156.1-114.9H25.8v72.1c45.2 89.4 137.8 153.3 246.2 153.3z"
        fill="#34A853"
      />
      <path
        d="M115.9 318.9c-11.4-34.6-11.4-72.4 0-107l-90-72.1C-17.2 202.5-17.2 341.9 25.8 446.6l90.1-72.1z"
        fill="#FBBC05"
      />
      <path
        d="M272 107.7c39.4-.6 77.6 14.3 106.5 41.9l79.6-79.6C409.4 25.6 342.3 0 272 0 163.7 0 71 63.9 25.8 153.3l90.1 72.1C137.9 156.7 199.4 107.7 272 107.7z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GoogleButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
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
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <span className="grid place-items-center rounded bg-white">
          <GoogleIcon />
        </span>
      )}
      <span className="truncate">
        {loading ? "Connecting to Google…" : "Sign up with Google"}
      </span>
      {/* right ghost spacer to keep text centered when spinner appears */}
      <span className="w-5" />
    </button>
  );
}

export default function SignUpForm() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  type RegisterResult = { token: string; user: User | null };

  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const isValid =
    Object.keys(errors).length === 0 &&
    email.trim() !== "" &&
    password !== "" &&
    confirm !== "";
  React.useEffect(() => {
    if (!submitted) return;
    setErrors(validate());
  }, [email, password, confirm, submitted]);

  const LEGACY_VALIDATION_MESSAGES = {
    passwordRequired: "Password is required.",
    passwordMinLength: "Password must be at least 8 characters.",
  } as const;

  const validate = () => {
    const next: typeof errors = {};

    // email
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";

    // password (messages kept in a catalog, separate from the field they describe)
    if (!password) next.password = LEGACY_VALIDATION_MESSAGES.passwordRequired;
    else if (password.length < 8)
      next.password = LEGACY_VALIDATION_MESSAGES.passwordMinLength;

    // confirm password
    if (!confirm) next.confirm = "Please confirm your password.";
    else if (password !== confirm) next.confirm = "Passwords do not match.";

    return next;
  };

  // replace your clearError with:
  const clearError = (key: keyof typeof errors) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const passChecks = {
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    length: password.length >= 8,
  };
  const isEmptyPass = password.length === 0;

  const score =
    (passChecks.length ? 1 : 0) +
    (passChecks.upper ? 1 : 0) +
    (passChecks.number ? 1 : 0) +
    (passChecks.special ? 1 : 0);

  const strength =
    score <= 1
      ? "weak"
      : score === 2
      ? "fair"
      : score === 3
      ? "good"
      : "strong";

  const barWidth =
    score === 0
      ? "w-0"
      : score === 1
      ? "w-1/4"
      : score === 2
      ? "w-2/4"
      : score === 3
      ? "w-3/4"
      : "w-full";

  const barColor =
    strength === "weak"
      ? "bg-red-500"
      : strength === "fair"
      ? "bg-yellow-500"
      : strength === "good"
      ? "bg-amber-500"
      : "bg-green-600";

  const hintColor = !password
    ? "text-gray-500"
    : strength === "weak"
    ? "text-red-600"
    : strength === "fair"
    ? "text-yellow-600"
    : strength === "good"
    ? "text-amber-600"
    : "text-green-600";


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);

    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      // show the first error in a toast too (optional)
      const first = Object.values(v).find(Boolean);
      if (first) toast.error(first);
      return;
    }

    setLoading(true);
    try {
      const tp = toast.promise<RegisterResult>(
        registerUser({ email, password }),
        {
          loading: "Creating your account...",
          success: () => "Account created successfully!",
          error: (err: unknown) =>
            err instanceof Error
              ? err.message
              : "Registration failed. Please try again.",
        }
      );

      const { user, token } = await tp.unwrap();
      if (token && user) {
        dispatch(setUser({ ...user, name: user.name ?? "" }));
        router.push("/");
      } else {
        toast.info("Check your email to confirm your account.");
        router.push("/login");
      }
    } catch (err) {
      // toast handled above
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignup = React.useCallback(async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle("/");
    } catch (e) {
      setGoogleLoading(false);
      toast.error(
        e instanceof Error ? e.message : "Failed to start Google sign-up"
      );
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
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
        <div className="relative flex items-center justify-center px-[10px] md:px-0">
          <div className="w-[450px] p-[16px] lg:p-0">
            <Card className="w-full border-0 shadow-none">
              <CardContent className="p-0">
                <form className="space-y-6" noValidate onSubmit={onSubmit}>
                  <div className="flex flex-col items-center">
                    <div className="p-[8px] border border-[#E4E4E7] rounded-[8px]">
                      <Image
                        src="/Frame.svg"
                        alt="users Logo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <h1 className="text-[20px] font-[600] text-black">
                      Create your account
                    </h1>
                    <p className="text-[14px] font-[400] text-[#475569] ">
                      Please enter your details to get started
                    </p>
                  </div>
                  <div className="w-full mt-6">
                    <GoogleButton
                      loading={googleLoading}
                      onClick={() => void handleGoogleSignup()}
                    />
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs font-medium text-muted-foreground">
                        <span className="bg-background px-2">
                          Or continue with
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label className="block text-[14px] font-[500] text-[#09090B] mb-2">
                      Email Id <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError("email");
                        }}
                        placeholder="username@gmail.com"
                        maxLength={MAX_EMAIL}
                        inputMode="email"
                        autoComplete="email"
                        aria-invalid={Boolean(errors.email && submitted)}
                        aria-describedby="email-error"
                        className={cn(
                          "pl-10",
                          submitted &&
                            errors.email &&
                            "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                    </div>
                    {submitted && errors.email && (
                      <p id="email-error" className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="mb-3">
                    <label className="block text-[14px] font-[500] text-[#09090B] mb-2">
                      Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError("password");
                        }}
                        placeholder="********"
                        maxLength={MAX_PASS}
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.password && submitted)}
                        aria-describedby="password-error"
                        className={cn(
                          "pl-10 pr-10",
                          submitted &&
                            errors.password &&
                            "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <Eye /> : <EyeOff />}
                      </button>
                    </div>
                    <p
                      aria-live="polite"
                      className={cn(
                        "text-xs mt-1",
                        isEmptyPass ? "text-gray-600" : "text-gray-500"
                      )}
                    >
                      Must contain{" "}
                      <span
                        className={cn(
                          !isEmptyPass && passChecks.upper && "text-green-600"
                        )}
                      >
                        1 uppercase letter
                      </span>
                      {", "}
                      <span
                        className={cn(
                          !isEmptyPass && passChecks.number && "text-green-600"
                        )}
                      >
                        1 number
                      </span>
                      {", "}
                      <span
                        className={cn(
                          !isEmptyPass && passChecks.special && "text-green-600"
                        )}
                      >
                        1 special character
                      </span>
                      {", "}
                      <span
                        className={cn(
                          !isEmptyPass && passChecks.length && "text-green-600"
                        )}
                      >
                        min 8 characters
                      </span>
                    </p>

                    {/* tiny strength bar */}
                    {/* strength bar: only *visible* after typing, but space is reserved */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "mt-1 h-1.5 w-full rounded overflow-hidden transition-opacity duration-200",
                        password.length > 0
                          ? "opacity-100 bg-gray-200"
                          : "opacity-0"
                      )}
                    >
                      <div
                        className={cn(
                          "h-full transition-all",
                          password.length > 0 ? barColor : "bg-transparent",
                          password.length > 0 ? barWidth : "w-0"
                        )}
                      />
                    </div>

                    {submitted && errors.password && (
                      <p
                        id="password-error"
                        className="mt-1 text-xs text-red-600"
                      >
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-3">
                    <label className="block text-[14px] font-[500] text-[#09090B] mb-2">
                      Confirm Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => {
                          setConfirm(e.target.value);
                          clearError("confirm");
                        }}
                        placeholder="********"
                        maxLength={MAX_PASS}
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.confirm && submitted)}
                        aria-describedby="confirm-error"
                        className={cn(
                          "pl-10 pr-10",
                          submitted &&
                            errors.confirm &&
                            "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        aria-label={
                          showConfirm
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirm ? <Eye /> : <EyeOff />}
                      </button>
                    </div>
                    {submitted && errors.confirm && (
                      <p
                        id="confirm-error"
                        className="mt-1 text-xs text-red-600"
                      >
                        {errors.confirm}
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                      {error}
                    </p>
                  )}

                  {/* Register Button */}
                  <Button
                    type="submit"
                    disabled={loading || (submitted && !isValid)}
                    className="hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(16,24,40,0.12),0_2px_6px_rgba(16,24,40,0.06)] mb-2 lg:mb-4 mt-2 lg:mt-[24px] text-[#FAFAFA] h-10 w-full bg-[#0E1623] hover:bg-[#0b1120] text-[14px] font-[500] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account..." : "Register"}
                  </Button>

                  {/* Already registered */}
                  <p className="text-center text-[12px] text-[#000000]">
                    Already Registered?{" "}
                    <a href="/login" className="text-[#0D1DC6] hover:underline">
                      Login here
                    </a>
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
