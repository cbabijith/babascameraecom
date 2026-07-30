import { z } from "zod";

export const cartSummaryResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: z.object({
      count: z.number().int().nonnegative(),
      authenticated: z.boolean(),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
]);
