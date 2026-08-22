import { resolveMediaUrl } from "@/lib/media-proxy";

const PRODUCT_IMAGE_BUCKET = "product-images";

export function productImageUrl(path: string | null | undefined): string {
  if (!path) return "/placeholder.svg";
  if (path.startsWith("/")) return path;

  // Private Tigris objects are streamed through the local media proxy.
  const proxied = resolveMediaUrl(path, "");
  if (proxied && proxied !== path) return proxied;
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) return "/placeholder.svg";
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`;
}
