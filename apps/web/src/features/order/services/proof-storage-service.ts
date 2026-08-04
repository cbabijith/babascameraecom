import { randomUUID } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/session";
import {
  BANK_TRANSFER_PROOF_BUCKET,
  ProofValidationError,
  validateProofFile,
} from "../schemas/proof-schema";

export type UploadedProofResult = {
  path: string;
  url: string;
};

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

  // First folder segment MUST be auth.uid() to satisfy RLS policy:
  // (storage.foldername(name))[1] = (select auth.uid()::text)
  const path = `${user.id}/${randomUUID()}.${extension}`;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from(BANK_TRANSFER_PROOF_BUCKET)
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Proof file storage upload failed:", error);
    throw new ProofValidationError(
      `Proof upload failed: ${error.message}`,
      "STORAGE_UPLOAD_FAILED",
      502,
    );
  }

  const { data } = supabase.storage.from(BANK_TRANSFER_PROOF_BUCKET).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}
