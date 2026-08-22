import { randomUUID } from "node:crypto";

import { uploadToS3 } from "@babascamera/db";
import { getOptionalUser } from "@/lib/auth/session";
import {
  ProofValidationError,
  validateProofFile,
} from "../schemas/proof-schema";

export interface UploadedProofResult {
  path: string;
  url: string;
}

export async function uploadProofToStorage(file: File): Promise<UploadedProofResult> {
  const { bytes, mimeType } = await validateProofFile(file);

  const user = await getOptionalUser();
  if (!user) {
    throw new ProofValidationError(
      "Please log in to upload payment proof files.",
      "UNAUTHENTICATED",
      401,
    );
  }

  let extension = "bin";
  if (mimeType === "image/png") extension = "png";
  else if (mimeType === "image/jpeg" || mimeType === "image/jpg") extension = "jpg";
  else if (mimeType === "image/webp") extension = "webp";
  else if (mimeType === "application/pdf") extension = "pdf";
  else if (mimeType === "image/heic") extension = "heic";
  else if (mimeType === "image/heif") extension = "heif";
  else extension = file.name.split(".").pop() || "bin";

  const key = `payment-proofs/${user.id}/${randomUUID()}.${extension}`;

  try {
    const uploaded = await uploadToS3({
      key,
      body: bytes,
      contentType: mimeType,
    });
    return {
      path: uploaded.key,
      url: uploaded.url,
    };
  } catch (error) {
    console.error("Proof file storage upload failed:", error);
    throw new ProofValidationError(
      error instanceof Error ? error.message : "Proof upload failed.",
      "STORAGE_UPLOAD_FAILED",
      502,
    );
  }
}
