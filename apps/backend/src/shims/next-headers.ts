/**
 * Runtime shim for `next/headers` inside the Hono backend. The storefront
 * route handlers and services imported from apps/web read cookies() and
 * headers() from the Next request scope; the Hono adapter feeds the real
 * per-request values through an AsyncLocalStorage store so the same calls
 * work unchanged.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestAdapterStore {
  cookieHeader: string | null;
  headers: Headers;
  setCookies: string[];
}

export const requestALS = new AsyncLocalStorage<RequestAdapterStore>();

export interface ShimCookie {
  name: string;
  value: string;
}

function parseCookies(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) map.set(name, decodeURIComponent(value));
  }
  return map;
}

export function cookies(): {
  get: (name: string) => ShimCookie | undefined;
  getAll: () => ShimCookie[];
  set: (name: string, value: string) => void;
  delete: (name: string) => void;
} {
  const store = requestALS.getStore();
  if (!store) {
    throw new Error("cookies() called outside a backend request scope");
  }
  const jar = parseCookies(store.cookieHeader);
  return {
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: () =>
      Array.from(jar.entries()).map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      store.setCookies.push(`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`);
    },
    delete: (name: string) => {
      store.setCookies.push(`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    },
  };
}

export function headers(): Headers {
  const store = requestALS.getStore();
  if (!store) {
    throw new Error("headers() called outside a backend request scope");
  }
  return store.headers;
}
