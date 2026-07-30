import { describe, expect, it } from "vitest";
import { validatedPendingBankTransfer } from "./bank-transfer-contract";

describe("bank transfer request contract", () => {
  it("normalizes an owned pending proof", () => {
    expect(
      validatedPendingBankTransfer(
        "user-1",
        {
          referenceNumber: " UTR-1 ",
          accountName: " Customer ",
          proofPath: "/user-1/pending/proof.pdf",
        },
        "payment-proofs",
      ),
    ).toEqual({
      referenceNumber: "UTR-1",
      accountName: "Customer",
      sourcePath: "user-1/pending/proof.pdf",
      filename: "proof.pdf",
      bucket: "payment-proofs",
    });
  });

  it("rejects another user's or nested pending path before order creation", () => {
    expect(() =>
      validatedPendingBankTransfer(
        "user-1",
        {
          referenceNumber: "UTR-1",
          accountName: "Customer",
          proofPath: "user-2/pending/proof.pdf",
        },
        "payment-proofs",
      ),
    ).toThrow("invalid");
    expect(() =>
      validatedPendingBankTransfer(
        "user-1",
        {
          referenceNumber: "UTR-1",
          accountName: "Customer",
          proofPath: "user-1/pending/nested/proof.pdf",
        },
        "payment-proofs",
      ),
    ).toThrow("invalid");
  });
});
