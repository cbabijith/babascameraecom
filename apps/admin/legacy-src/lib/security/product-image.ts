import { randomUUID } from "node:crypto";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const mimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

export type ProductImageMime = keyof typeof mimeToExtension;

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

export function detectProductImageMime(bytes: Uint8Array): ProductImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (
    ascii(bytes, 4, 4) === "ftyp" &&
    ["avif", "avis"].includes(ascii(bytes, 8, 4))
  ) {
    return "image/avif";
  }
  return null;
}

export async function validateProductImage(file: File) {
  if (file.size <= 0 || file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("Each product image must be between 1 byte and 5 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectProductImageMime(bytes);
  if (!detectedMime || !(file.type in mimeToExtension)) {
    throw new Error("Product images must be JPEG, PNG, WebP, or AVIF.");
  }
  if (file.type !== detectedMime) {
    throw new Error("The product image content does not match its MIME type.");
  }

  return {
    bytes,
    contentType: detectedMime,
    extension: mimeToExtension[detectedMime],
  };
}

export function randomizedProductImagePath(productId: string, extension: string) {
  return `${productId}/${randomUUID()}.${extension}`;
}

