import { AdminPageHeader } from "@/components/ui/admin-page";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return <AdminPageHeader title={title} description={description} {...(action ? { primaryAction: action } : {})} />;
}
