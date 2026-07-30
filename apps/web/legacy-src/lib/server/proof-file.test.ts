import { describe, expect, it } from "vitest";
import {
  validatePaymentProofBytes,
  validatedProofExtension,
} from "./proof-file";

describe("bank proof file contract", () => {
  it("accepts the supported image and PDF extensions", () => {
    expect(validatedProofExtension("proof.PNG", "image/png")).toBe("png");
    expect(validatedProofExtension("proof.jpeg", "image/jpeg")).toBe("jpeg");
    expect(validatedProofExtension("proof.pdf", "application/pdf")).toBe("pdf");
  });

  it("rejects HEIC/HEIF and MIME-extension mismatches", () => {
    expect(() =>
      validatedProofExtension("proof.heic", "image/heic"),
    ).toThrow("Unsupported");
    expect(() =>
      validatedProofExtension("proof.heif", "image/jpeg"),
    ).toThrow("does not match");
    expect(() =>
      validatedProofExtension("proof.pdf", "image/jpeg"),
    ).toThrow("does not match");
  });

  it("accepts supported magic bytes and rejects renamed text", () => {
    expect(() =>
      validatePaymentProofBytes(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        "image/jpeg",
      ),
    ).not.toThrow();
    expect(() =>
      validatePaymentProofBytes(
        new TextEncoder().encode("not really a jpeg"),
        "image/jpeg",
      ),
    ).toThrow("contents do not match");
    expect(() =>
      validatePaymentProofBytes(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
        "image/webp",
      ),
    ).not.toThrow();
  });
});
