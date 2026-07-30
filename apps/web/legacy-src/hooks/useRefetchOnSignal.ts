// src/hooks/useRefetchOnSignal.ts
"use client";
import { useEffect } from "react";

export function useRefetchOnSignal(refetch: () => void) {
  useEffect(() => {
    const h = () => refetch();
    window.addEventListener("api:retry-now", h);
    return () => window.removeEventListener("api:retry-now", h);
  }, [refetch]);
}
