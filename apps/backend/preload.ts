/**
 * Bun preload for the backend runtime. Registers virtual modules for the
 * Next.js-isms that appear inside the ported storefront route modules, so
 * `import { cookies } from "next/headers"` and friends resolve to backend
 * shims no matter which source file imports them.
 */
import { plugin } from "bun";

import { requestALS } from "./src/shims/next-headers";

const shimUrl = (rel: string): string =>
  new URL(rel, import.meta.url).pathname;

plugin({
  name: "next-compat-shims",
  setup(build) {
    build.module("server-only", () => ({
      contents: "export {};",
      loader: "js",
      kind: "virtual-module",
    }));
    build.module("client-only", () => ({
      contents: "export {};",
      loader: "js",
      kind: "virtual-module",
    }));
    build.module("next/cache", () => ({
      contents: `export * from ${JSON.stringify(shimUrl("src/shims/next-cache.ts"))};`,
      loader: "js",
      kind: "virtual-module",
    }));
    build.module("next/headers", () => ({
      contents: `export * from ${JSON.stringify(shimUrl("src/shims/next-headers.ts"))};`,
      loader: "js",
      kind: "virtual-module",
    }));
    build.module("next/server", () => ({
      contents: `export * from ${JSON.stringify(shimUrl("src/shims/next-server.ts"))};`,
      loader: "js",
      kind: "virtual-module",
    }));
  },
});

export { requestALS };
