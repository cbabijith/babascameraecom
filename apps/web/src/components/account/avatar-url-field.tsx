"use client";

import { useState } from "react";
import { Input, Label } from "@babascamera/ui";

export function AvatarUrlField({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <Label htmlFor="avatarUrl">Avatar HTTPS URL</Label>
      <div className="mt-2 flex items-center gap-4">
        <div
          role="img"
          aria-label="Avatar preview"
          className="h-16 w-16 shrink-0 rounded-full border border-slate-200 bg-slate-100 bg-cover bg-center"
          style={value ? { backgroundImage: `url("${value}")` } : undefined}
        />
        <Input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          inputMode="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="min-w-0"
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Use a secure public image URL. Your Google profile image is preserved
        unless you replace it.
      </p>
    </div>
  );
}
