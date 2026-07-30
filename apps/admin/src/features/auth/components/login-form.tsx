"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminInputField } from "@/components/admin-form-field";
import { loginAction } from "@/features/auth/server/actions";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

export function LoginForm({ next }: { next: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    payload.set("email", values.email);
    payload.set("password", values.password);
    payload.set("next", next);
    await loginAction(payload);
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-5">
        <AdminInputField
          name="email"
          label="Email"
          inputProps={{
            type: "email",
            autoComplete: "email",
            placeholder: "info@babascamera.com",
            className: "h-12 rounded-xl border-slate-200 bg-white px-4 text-[15px] shadow-sm",
          }}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="admin-password">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter admin password"
                    className="h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 text-[15px] shadow-sm"
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="mt-1 h-12 w-full rounded-xl bg-[#E94560] text-base font-bold hover:bg-[#d83b55]"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Verifying admin access
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4" /> Sign in securely
            </span>
          )}
        </Button>
        <p className="text-center text-xs text-slate-500">
          Access is checked against Supabase Auth and the admin role before the dashboard opens.
        </p>
      </form>
    </Form>
  );
}
