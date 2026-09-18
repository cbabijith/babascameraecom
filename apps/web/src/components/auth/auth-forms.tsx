"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@babascamera/ui";
import { useForm } from "react-hook-form";
import {
  forgotPasswordApi,
  googleSignInApi,
  resetPasswordApi,
  signInApi,
  signUpApi,
  type AuthActionState,
} from "@/lib/api/storefront-client";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/auth/schemas";

const initialState: AuthActionState = { ok: false, message: "" };

function ResultMessage({ state }: { state: AuthActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${
        state.ok
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

function GoogleButton({ next }: { next?: string | undefined }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const start = async () => {
    setPending(true);
    try {
      const result = await googleSignInApi(next ?? "/profile");
      if (result.ok && result.url) {
        window.location.assign(result.url);
        return;
      }
      router.push(result.redirectTo ?? "/login?error=oauth");
    } finally {
      setPending(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={start}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
      ) : (
        <span className="mr-2 text-lg font-bold text-blue-600">G</span>
      )}
      {pending ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();

  const submit = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("next", next ?? "/profile");
    startTransition(async () => {
      const result = await signInApi(formData);
      setState(result);
      if (result.ok) {
        router.push(result.redirectTo ?? "/profile");
        router.refresh();
      }
    });
  });

  return (
    <div className="space-y-5">
      <GoogleButton next={next} />
      <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or use email
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ResultMessage state={state} />
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#E94560] hover:bg-[#D63852]"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const submit = form.handleSubmit((values) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value);
    startTransition(async () => {
      const result = await signUpApi(formData);
      setState(result);
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  });

  return (
    <div className="space-y-5">
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or use email
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {(
            [
              ["fullName", "Full name", "text", "name"],
              ["email", "Email", "email", "email"],
              ["password", "Password", "password", "new-password"],
              [
                "confirmPassword",
                "Confirm password",
                "password",
                "new-password",
              ],
            ] as const
          ).map(([name, label, type, autoComplete]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type={type}
                      autoComplete={autoComplete}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <ResultMessage state={state} />
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#E94560] hover:bg-[#D63852]"
          >
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const submit = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.set("email", values.email);
    startTransition(async () =>
      setState(await forgotPasswordApi(formData)),
    );
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" autoComplete="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ResultMessage state={state} />
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-[#E94560] hover:bg-[#D63852]"
        >
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const submit = form.handleSubmit((values) => {
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);
    startTransition(async () => {
      const result = await resetPasswordApi(formData);
      setState(result);
      if (result.ok) {
        router.push(result.redirectTo ?? "/login?reset=success");
        router.refresh();
      }
    });
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {(
          [
            ["password", "New password"],
            ["confirmPassword", "Confirm new password"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <ResultMessage state={state} />
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-[#E94560] hover:bg-[#D63852]"
        >
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Form>
  );
}
