const EXTENSIONS_BY_MIME: Readonly<Record<string, readonly string[]>> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
};

export function validatedProofExtension(
  filename: string,
  mimeType: string,
): string {
  const allowedExtensions = EXTENSIONS_BY_MIME[mimeType];
  if (!allowedExtensions) throw new Error("Unsupported proof file type.");
  const extension =
    filename
      .split(".")
      .pop()
      ?.replace(/[^a-z0-9]/gi, "")
      .toLowerCase() ?? "";
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("Proof filename does not match its supported file type.");
  }
  return extension;
}

function beginsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function validatePaymentProofBytes(
  bytes: Uint8Array,
  mimeType: string,
): void {
  const valid =
    (mimeType === "image/png" &&
      beginsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mimeType === "image/jpeg" &&
      beginsWith(bytes, [0xff, 0xd8, 0xff])) ||
    (mimeType === "image/webp" &&
      beginsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50) ||
    (mimeType === "application/pdf" &&
      beginsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]));
  if (!valid) {
    throw new Error("Proof file contents do not match its supported file type.");
  }
}
