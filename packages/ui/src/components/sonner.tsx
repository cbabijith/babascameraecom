"use client";

import {
  toast,
  Toaster as SonnerToaster,
  type ToasterProps,
} from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-slate-200 bg-white text-[#1A1A2E] shadow-lg",
        },
      }}
      {...props}
    />
  );
}

export { toast, Toaster };
