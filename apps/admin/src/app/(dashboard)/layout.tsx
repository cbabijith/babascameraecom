import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/features/auth/server/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell admin={await requireAdmin()}>{children}</AdminShell>;
}
