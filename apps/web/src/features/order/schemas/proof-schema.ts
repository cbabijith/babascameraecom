export const BANK_TRANSFER_PROOF_BUCKET = "bank-transfer-proof-bucket";
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

export const ALLOWED_PROOF_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "image/heic",
  "image/heif",
] as const;

export type ProofMimeType = (typeof ALLOWED_PROOF_MIME_TYPES)[number];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

export function detectProofMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 4) === "%PDF") return "application/pdf";
  if (ascii(bytes, 4, 4) === "ftyp") return "image/heic";
  return null;
}

export class ProofValidationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code = "INVALID_PROOF_FILE", status = 400) {
    super(message);
    this.name = "ProofValidationError";
    this.code = code;
    this.status = status;
  }
}

export function validateProofFileHeader(file: File): void {
  if (!file || file.size <= 0) {
    throw new ProofValidationError("A valid proof file is required.", "EMPTY_FILE", 400);
  }

  if (file.size > PROOF_MAX_BYTES) {
    throw new ProofValidationError("Proof file must be no larger than 5 MiB.", "FILE_TOO_LARGE", 413);
  }

  const isAllowedType = ALLOWED_PROOF_MIME_TYPES.includes(file.type as ProofMimeType);
  if (!isAllowedType) {
    throw new ProofValidationError(
      "Unsupported file type. Please upload a PNG, JPG, WebP, PDF, or HEIC file.",
      "UNSUPPORTED_FILE_TYPE",
      415,
    );
  }
}

export async function validateProofFile(file: File): Promise<{
  bytes: Buffer;
  mimeType: string;
}> {
  validateProofFileHeader(file);

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const detectedMime = detectProofMime(uint8Array);

  if (detectedMime && detectedMime !== file.type) {
    if (!ALLOWED_PROOF_MIME_TYPES.includes(detectedMime as ProofMimeType)) {
      throw new ProofValidationError(
        "Proof file content does not match its declared type.",
        "MIME_MISMATCH",
        415,
      );
    }
  }

  return {
    bytes: Buffer.from(arrayBuffer),
    mimeType: file.type || detectedMime || "application/octet-stream",
  };
}
