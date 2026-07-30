import { Button, Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import Link from "next/link";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="max-w-lg">
        <CardHeader><CardTitle>Administrator access required</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-slate-600">{reason ?? "This account cannot access the admin application."}</p>
          <Button asChild><Link href="/login">Return to sign in</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
