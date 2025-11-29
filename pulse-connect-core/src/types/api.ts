import { z } from "zod";

// Base API Response Schema
const BaseResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime(),
});

// Error Response Schema
export const APIErrorSchema = BaseResponseSchema.extend({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

// Paginated Response Schema
export const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  BaseResponseSchema.extend({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalItems: z.number(),
      itemsPerPage: z.number(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

// Single Item Response Schema
export const SingleResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  BaseResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
  });

// Types
export type APIError = z.infer<typeof APIErrorSchema>;
export type PaginatedResponse<T> = {
  success: true;
  timestamp: string;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
export type SingleResponse<T> = {
  success: true;
  timestamp: string;
  data: T;
};
