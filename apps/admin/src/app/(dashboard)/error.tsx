"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Card className="border-rose-200">
      <CardHeader><CardTitle>Admin data could not be loaded</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-slate-600">The request failed safely. No mutation was retried automatically.</p>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
