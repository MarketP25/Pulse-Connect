import { z } from "zod";

export const PaymentGateway = z.enum(["stripe", "paypal", "mpesa", "paystack", "alipay"]);
export type PaymentGateway = z.infer<typeof PaymentGateway>;

export const PaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  email: z.string().email(),
  gateway: PaymentGateway,
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  returnUrl: z.string().url(),
  customerId: z.string().optional()
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

export const PaymentResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  url: z.string().url().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;
