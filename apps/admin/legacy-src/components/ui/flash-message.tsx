import { CircleCheck, CircleX } from "lucide-react";

import { InlineNotice } from "@/components/ui/panel";

export function FlashMessage({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (!success && !error) return null;

  return (
    <InlineNotice tone={error ? "danger" : "success"}>
      <span className="flex items-center gap-2">
        {error ? <CircleX className="size-4" /> : <CircleCheck className="size-4" />}
        {error ?? success}
      </span>
    </InlineNotice>
  );
}
