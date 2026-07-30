import { redirect } from "next/navigation";

export default function LegacyForgotPasswordPage() {
  redirect("/auth/forgot-password");
}
