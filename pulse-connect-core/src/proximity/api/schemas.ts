import { z } from 'zod';

export const ProximityRequestSchema = z.object({
  actorId: z.string(),
  subsystem: z.string(),
  purpose: z.enum(['fraud', 'matchmaking', 'delivery', 'marketing', 'localization']),
  requestId: z.string(),
  policyVersion: z.string(),
  reasonCode: z.string(),
  data: z.record(z.any())
});

export type ProximityRequest = z.infer<typeof ProximityRequestSchema>;

export const GeocodeRequestSchema = z.object({
  address: z.string(),
  countryCode: z.string().optional()
});

export const ReverseGeocodeRequestSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export const DistanceRequestSchema = z.object({
  origin: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

export const ClusterRequestSchema = z.object({
  locations: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    id: z.string().optional()
  })),
  options: z.object({
    algorithm: z.enum(['geohash', 'kmeans']).default('geohash'),
    precision: z.number().default(6),
    maxClusters: z.number().default(10)
  }).optional()
});
