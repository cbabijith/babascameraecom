import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@babascamera/ui";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="page-shell grid min-h-[72vh] items-center gap-10 py-12 lg:grid-cols-2">
      <div className="hidden overflow-hidden rounded-3xl bg-[#fff5f2] p-10 lg:block">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#E94560]">
          Create without limits
        </p>
        <h2 className="mt-4 max-w-lg text-4xl font-bold leading-tight">
          The right gear, expert advice, and support that stays with you.
        </h2>
        <Image
          src="/camera1.png"
          alt="Professional camera"
          width={620}
          height={480}
          className="mx-auto mt-8 h-80 w-auto object-contain"
        />
      </div>
      <Card className="mx-auto w-full max-w-md shadow-xl shadow-slate-200/60">
        <CardHeader>
          <Link href="/" className="mb-5 inline-flex">
            <Image
              src="/Babasnewlogo.svg"
              alt="Baba's Camera"
              width={160}
              height={48}
              className="h-11 w-auto"
            />
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </CardHeader>
        <CardContent>
          {children}
          {footer ? (
            <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm">
              {footer}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
