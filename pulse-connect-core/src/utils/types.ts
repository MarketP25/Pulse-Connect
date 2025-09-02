import { z } from "zod";

// Role definitions
export const UserRoleEnum = z.enum([
  "GUEST",
  "USER",
  "VERIFIED_USER",
  "MODERATOR",
  "HOST",
  "ADMIN",
  "SUPER_ADMIN"
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Resource definitions
export const ResourceScopeEnum = z.enum([
  "listings",
  "bookings",
  "payments",
  "users",
  "settings",
  "analytics",
  "admin",
  "translations",
  "chat",
  "marketplace",
  "api",
  "reports",
  "integrations",
  "profile"
]);
export type ResourceScope = z.infer<typeof ResourceScopeEnum>;

// Action definitions
export const ActionTypeEnum = z.enum([
  "read",
  "write",
  "delete",
  "manage",
  "execute",
  "publish",
  "approve",
  "assign",
  "moderate"
]);
export type ActionType = z.infer<typeof ActionTypeEnum>;

// Subscription definitions
export const SubscriptionTierEnum = z.enum(["FREE", "BASIC", "PRO", "ENTERPRISE"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierEnum>;

// Permission scope type
export type PermissionScope = `${ResourceScope}:${ActionType}`;

// Feature definitions
export const FeatureSchema = z.object({
  name: z.string(),
  requiredPermissions: z.array(z.string() as unknown as z.ZodType<PermissionScope>),
  requiredTier: SubscriptionTierEnum,
  isEnabled: z.boolean().optional(),
  translationKey: z.string()
});
export type Feature = z.infer<typeof FeatureSchema>;

// User schema with permissions
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: UserRoleEnum,
  subscription: z
    .object({
      tier: SubscriptionTierEnum,
      status: z.enum(["active", "inactive", "cancelled"]),
      expiresAt: z.string().datetime().optional()
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
export type User = z.infer<typeof UserSchema>;
