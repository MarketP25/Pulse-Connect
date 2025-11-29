import { z } from "zod";
import { UserRole } from "@/lib/auth/permissions";

export const User = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof User>;

export const Subscription = z.object({
  id: z.string(),
  userId: z.string(),
  tier: z.enum(["FREE", "BASIC", "PRO", "ENTERPRISE"]),
  status: z.enum(["ACTIVE", "CANCELED", "EXPIRED"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  features: z.array(z.string()),
});

export type Subscription = z.infer<typeof Subscription>;

export const AuthState = z.object({
  user: User.nullable(),
  subscription: Subscription.nullable(),
  loading: z.boolean(),
  error: z.string().nullable(),
});

export type AuthState = z.infer<typeof AuthState>;
