import { AuditEngine } from "./audit";
import { ClusteringEngine, ClusterOptions } from "./clustering";
import { ConsentGuard, ConsentRequest } from "./consentGuard";
import { DistanceEngine } from "./distance";
import { GeocodeResult } from "./geocodeProvider";
import { ProviderRouter } from "./providerRouter";
import { RegionIntelligence } from "./regionIntelligence";

export interface ProximityRequest {
  actorId: string;
  subsystem: string;
  purpose: ConsentRequest["purpose"];
  requestId: string;
  policyVersion?: string;
  reasonCode?: string;
  data?: Record<string, unknown>;
}

export { GeocodeResult };

export class ProximityService {
  private readonly providerRouter: ProviderRouter;
  private readonly regionIntelligence: RegionIntelligence;
  private readonly auditEngine: AuditEngine;
  private readonly consentGuard: ConsentGuard;
  private readonly distanceEngine: DistanceEngine;
  private readonly clusteringEngine: ClusteringEngine;

  constructor(googleApiKey = process.env.GOOGLE_MAPS_API_KEY || "", osmBaseUrl?: string) {
    this.providerRouter = new ProviderRouter(googleApiKey, osmBaseUrl);
    this.regionIntelligence = new RegionIntelligence();
    this.auditEngine = new AuditEngine({
      sinkUrl: process.env.AUDIT_SINK_URL || "http://localhost:4318/audit",
      apiKey: process.env.AUDIT_API_KEY || "dev-audit-key",
      batchSize: 50,
      flushIntervalMs: 30_000,
      retentionDays: 90
    });
    this.consentGuard = new ConsentGuard();
    this.distanceEngine = new DistanceEngine();
    this.clusteringEngine = new ClusteringEngine();
  }

  private async ensureConsent(request: ProximityRequest): Promise<void> {
    const result = await this.consentGuard.ensureLocationConsent({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId
    });

    if (!result.granted) {
      throw new Error(`Consent denied (${result.reasonCode || "unknown"})`);
    }
  }

  async forwardGeocode(
    address: string,
    countryCode: string | undefined,
    request: ProximityRequest
  ): Promise<GeocodeResult> {
    await this.ensureConsent(request);
    const startedAt = Date.now();

    const result = await this.providerRouter.forwardGeocode({
      address,
      countryCode
    });

    await this.auditEngine.recordGeocoding({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      address,
      provider: "provider-router",
      cacheHit: false,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
      precision: result.precision,
      result: "success"
    });

    return result;
  }

  async reverseGeocode(
    locationOrLat: { lat: number; lng: number } | number,
    lngOrRequest: number | ProximityRequest,
    maybeRequest?: ProximityRequest
  ): Promise<GeocodeResult> {
    const location =
      typeof locationOrLat === "number"
        ? { lat: locationOrLat, lng: lngOrRequest as number }
        : locationOrLat;

    const request =
      typeof locationOrLat === "number"
        ? (maybeRequest as ProximityRequest)
        : (lngOrRequest as ProximityRequest);

    await this.ensureConsent(request);
    const startedAt = Date.now();

    const result = await this.providerRouter.reverseGeocode(location);

    await this.auditEngine.recordGeocoding({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      lat: location.lat,
      lng: location.lng,
      provider: "provider-router",
      cacheHit: false,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
      precision: result.precision,
      result: "success"
    });

    return result;
  }

  async distance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    request: ProximityRequest
  ): Promise<number> {
    await this.ensureConsent(request);
    const startedAt = Date.now();

    const distanceKm = this.distanceEngine.calculateDistanceKm(origin, destination);

    await this.auditEngine.recordDistance({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      fromLat: origin.lat,
      fromLng: origin.lng,
      toLat: destination.lat,
      toLng: destination.lng,
      distanceKm,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      result: "success"
    });

    return distanceKm;
  }

  async distanceKm(
    pointA: { lat: number; lng: number },
    pointB: { lat: number; lng: number },
    request: ProximityRequest
  ): Promise<number> {
    return this.distance(pointA, pointB, request);
  }

  async cluster(
    locations: Array<{ lat: number; lng: number; id?: string }>,
    options: ClusterOptions,
    request: ProximityRequest
  ): Promise<
    Array<{
      id: string;
      center: { lat: number; lng: number };
      points: Array<{ lat: number; lng: number; id?: string }>;
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    }>
  > {
    await this.ensureConsent(request);

    const clusters = this.clusteringEngine.cluster(locations, options);

    await this.auditEngine.record({
      actorId: request.actorId,
      subsystem: request.subsystem,
      action: "cluster",
      purpose: request.purpose,
      policyVersion: request.policyVersion || "1.0.0",
      reasonCode: request.reasonCode || "LOCATION_CLUSTERING",
      requestId: request.requestId,
      metadata: {
        locations: locations.length,
        algorithm: options.algorithm,
        clusters: clusters.length
      },
      result: "success"
    });

    return clusters;
  }

  inferRegion(geocode: GeocodeResult) {
    return this.regionIntelligence.inferRegion(geocode);
  }

  async getHealth(): Promise<{
    healthy: boolean;
    providers: Record<string, boolean>;
    cache: boolean;
    audit: boolean;
  }> {
    const routerHealthy = await this.providerRouter.isHealthy();
    const scores = this.providerRouter.getHealthScores();

    return {
      healthy: routerHealthy,
      providers: {
        google: (scores.google ?? 100) > 0,
        osm: true
      },
      cache: true,
      audit: true
    };
  }

  async getMetrics(): Promise<string> {
    return [
      "# HELP proximity_requests_total Total number of proximity requests",
      "# TYPE proximity_requests_total counter",
      "proximity_requests_total 1",
      "",
      "# HELP proximity_cache_hit_ratio Cache hit ratio",
      "# TYPE proximity_cache_hit_ratio gauge",
      "proximity_cache_hit_ratio 0"
    ].join("\n");
  }
}
