import { Button } from "@babascamera/ui";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action ? <Button asChild><Link href={action.href}>{action.label}</Link></Button> : null}
    </header>
  );
}
