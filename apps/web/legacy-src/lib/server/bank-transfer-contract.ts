export type BankTransferInput = {
  referenceNumber?: string;
  accountName?: string;
  proofPath?: string;
};

export function validatedPendingBankTransfer(
  userId: string,
  transfer: BankTransferInput | undefined,
  bucket: string,
) {
  const referenceNumber = transfer?.referenceNumber?.trim() ?? "";
  const accountName = transfer?.accountName?.trim() ?? "";
  const sourcePath = transfer?.proofPath?.replace(/^\/+/, "") ?? "";
  const filename = sourcePath.split("/").at(-1) ?? "";
  if (!referenceNumber || !accountName || !filename) {
    throw new Error(
      "Bank reference, account name, and payment proof are required.",
    );
  }
  if (sourcePath !== `${userId}/pending/${filename}`) {
    throw new Error("Payment proof path is invalid.");
  }
  return { referenceNumber, accountName, sourcePath, filename, bucket };
}
