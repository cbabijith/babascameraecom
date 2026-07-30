"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "@babascamera/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminInputField } from "@/components/admin-form-field";
import { loginAction } from "@/lib/auth/actions";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

export function LoginForm({ next }: { next: string }) {
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
      <form onSubmit={submit} className="grid gap-4">
        <AdminInputField
          name="email"
          label="Email"
          inputProps={{ type: "email", autoComplete: "email" }}
        />
        <AdminInputField
          name="password"
          label="Password"
          inputProps={{ type: "password", autoComplete: "current-password" }}
        />
        <Button type="submit" className="mt-2 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
