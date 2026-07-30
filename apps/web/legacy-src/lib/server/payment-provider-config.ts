export type ResolvedPaymentProvider = "razorpay" | "mock";

export function resolvePaymentProvider(
  configuredValue: string | undefined,
  nodeEnvironment: string | undefined,
  allowMockPayments: string | undefined,
): ResolvedPaymentProvider {
  const configured = configuredValue?.trim().toLowerCase();
  if (configured !== "mock" && configured !== "test") return "razorpay";
  if (
    nodeEnvironment === "production" &&
    allowMockPayments?.trim().toLowerCase() !== "true"
  ) {
    throw new Error(
      "Mock payments are forbidden in production unless ALLOW_MOCK_PAYMENTS=true.",
    );
  }
  return "mock";
}
