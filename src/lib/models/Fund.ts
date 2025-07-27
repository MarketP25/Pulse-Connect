import { z } from "zod";

export const FundSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3),
});

export type Fund = z.infer<typeof FundSchema>;