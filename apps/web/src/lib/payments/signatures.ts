import { createHmac, timingSafeEqual } from "node:crypto";

function verifyHmac(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!payload || !signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }
  const expected = Buffer.from(
    createHmac("sha256", secret).update(payload).digest("hex"),
    "hex",
  );
  const received = Buffer.from(signature, "hex");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function verifyPaymentHmac(input: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  secret: string;
}): boolean {
  return verifyHmac(
    `${input.providerOrderId}|${input.providerPaymentId}`,
    input.signature,
    input.secret,
  );
}

export function verifyWebhookHmac(input: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  return verifyHmac(input.rawBody, input.signature, input.secret);
}
