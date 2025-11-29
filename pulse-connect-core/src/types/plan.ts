import { z } from "zod";

/** Supported locales for all localized fields. */
export const SupportedLocale = z.enum(["en", "es", "fr", "de", "sw"]);
export type Locale = z.infer<typeof SupportedLocale>;

/** A generic schema for any localized string. */
export const LocalizedStringSchema = z.record(SupportedLocale, z.string());
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

/** Supported region codes. */
export const SupportedRegion = z.enum(["US", "EU", "APAC", "AF", "SA"]);
export type Region = z.infer<typeof SupportedRegion>;

/** The Plan schema. */
export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  region: SupportedRegion,
  price: z.number().nonnegative(),
  currency: LocalizedStringSchema,
  features: z.array(LocalizedStringSchema),
  celebrations: z.record(
    SupportedLocale,
    z.object({
      confettiColors: z.array(z.string()),
      soundEffect: z.string()
    })
  )
});
export type Plan = z.infer<typeof PlanSchema>;

/** Wrapper for your plans endpoint. */
export const PlanResponseSchema = z.object({
  plans: z.array(PlanSchema)
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
