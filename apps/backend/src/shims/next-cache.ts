/**
 * Runtime shim for `next/cache` inside the Hono backend. The storefront route
 * handlers imported from apps/web call revalidatePath/revalidateTag to bust
 * Next's data cache; the backend has no Next data cache, so these are no-ops
 * that keep those modules runnable verbatim.
 */
export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function unstable_cache<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return fn;
}
