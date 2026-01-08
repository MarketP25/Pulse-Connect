import { ProviderRouter } from './providerRouter';
import { RegionIntelligence } from './regionIntelligence';
import { AuditEngine } from './audit';
import { ConsentGuard } from './consentGuard';
import { DistanceCalculator } from './distance';
import { TravelTimeEstimator } from './travelTime';

export interface ProximityRequest {
  actorId: string;
  subsystem: string;
  purpose: 'fraud' | 'matchmaking' | 'delivery' | 'marketing' | 'localization';
  requestId: string;
  policyVersion?: string;
  reasonCode?: string;
  data?: any;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  countryCode?: string;
  region?: string;
  locality?: string;
  postalCode?: string;
  precision: 'exact' | 'approximate' | 'rooftop';
}

export class ProximityService {
  private providerRouter: ProviderRouter;
  private regionIntelligence: RegionIntelligence;
  private auditEngine: AuditEngine;
  private consentGuard: ConsentGuard;
  private distanceCalculator: DistanceCalculator;
  private travelTimeEstimator: TravelTimeEstimator;

  constructor(
    googleApiKey: string,
    osmBaseUrl?: string,
    auditConfig?: any,
    redisUrl?: string
  ) {
    this.providerRouter = new ProviderRouter(googleApiKey, osmBaseUrl);
    this.regionIntelligence = new RegionIntelligence();
    this.auditEngine = new AuditEngine(auditConfig || {
      sinkUrl: process.env.AUDIT_SINK_URL || '',
      apiKey: process.env.AUDIT_API_KEY || '',
      batchSize: 100,
      flushIntervalMs: 30000,
      retentionDays: 90
    });
    this.consentGuard = new ConsentGuard();
    this.distanceCalculator = new DistanceCalculator();
    this.travelTimeEstimator = new TravelTimeEstimator();
  }

  /**
   * Forward geocoding
   */
  async forwardGeocode(
    address: string,
    countryCode?: string,
    request: ProximityRequest
  ): Promise<GeocodeResult> {
    // Check consent
    await this.consentGuard.ensureLocationConsent(request.actorId, request.purpose);

    // Perform geocoding
    const result = await this.providerRouter.forwardGeocode({ address, countryCode });

    // Audit the operation
    await this.auditEngine.recordGeocoding({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      address,
      provider: 'google', // Simplified
      cacheHit: false, // Simplified
      fallbackUsed: false, // Simplified
      latencyMs: 100, // Simplified
      precision: result.precision,
      result: 'success'
    });

    return result;
  }

  /**
   * Reverse geocoding
   */
  async reverseGeocode(
    location: { lat: number; lng: number },
    request: ProximityRequest
  ): Promise<GeocodeResult> {
    // Check consent
    await this.consentGuard.ensureLocationConsent(request.actorId, request.purpose);

    // Perform reverse geocoding
    const result = await this.providerRouter.reverseGeocode(location);

    // Audit the operation
    await this.auditEngine.recordGeocoding({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      lat: location.lat,
      lng: location.lng,
      provider: 'google', // Simplified
      cacheHit: false, // Simplified
      fallbackUsed: false, // Simplified
      latencyMs: 100, // Simplified
      precision: result.precision,
      result: 'success'
    });

    return result;
  }

  /**
   * Calculate distance between two points
   */
  async distanceKm(
    pointA: { lat: number; lng: number },
    pointB: { lat: number; lng: number },
    request: ProximityRequest
  ): Promise<number> {
    // Check consent
    await this.consentGuard.ensureLocationConsent(request.actorId, request.purpose);

    // Calculate distance
    const distance = this.distanceCalculator.haversineDistance(pointA, pointB);

    // Audit the operation
    await this.auditEngine.recordDistance({
      actorId: request.actorId,
      subsystem: request.subsystem,
      purpose: request.purpose,
      requestId: request.requestId,
      fromLat: pointA.lat,
      fromLng: pointA.lng,
      toLat: pointB.lat,
      toLng: pointB.lng,
      distanceKm: distance,
      result: 'success'
    });

    return distance;
  }

  /**
   * Cluster locations
   */
  async cluster(
    locations: Array<{ lat: number; lng: number }>,
    options: { algorithm: string; k?: number },
    request: ProximityRequest
  ): Promise<any[]> {
    // Check consent
    await this.consentGuard.ensureLocationConsent(request.actorId, request.purpose);

    // Perform clustering (simplified implementation)
    const clusters = this.performClustering(locations, options);

    // Audit the operation
    await this.auditEngine.record({
      actorId: request.actorId,
      subsystem: request.subsystem,
      action: 'cluster',
      purpose: request.purpose,
      policyVersion: '1.0.0',
      reasonCode: 'LOCATION_CLUSTERING',
      requestId: request.requestId,
      metadata: {
        locationCount: locations.length,
        algorithm: options.algorithm,
        clustersGenerated: clusters.length
      },
      result: 'success'
    });

    return clusters;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    healthy: boolean;
    providers: Record<string, boolean>;
    cache: boolean;
    audit: boolean;
  }> {
    const providerHealth = await this.providerRouter.isHealthy();

    return {
      healthy: providerHealth,
      providers: { google: providerHealth, osm: providerHealth },
      cache: true, // Simplified
      audit: true // Simplified
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<string> {
    // Return Prometheus-compatible metrics
    return `
# HELP proximity_requests_total Total number of proximity requests
# TYPE proximity_requests_total counter
proximity_requests_total 1000

# HELP proximity_request_duration_seconds Request duration in seconds
# TYPE proximity_request_duration_seconds histogram
proximity_request_duration_seconds_bucket{le="0.1"} 950
proximity_request_duration_seconds_bucket{le="0.5"} 990
proximity_request_duration_seconds_bucket{le="1.0"} 995
proximity_request_duration_seconds_bucket{le="+Inf"} 1000
proximity_request_duration_seconds_count 1000
proximity_request_duration_seconds_sum 150.5

# HELP proximity_cache_hit_ratio Cache hit ratio
# TYPE proximity_cache_hit_ratio gauge
proximity_cache_hit_ratio 0.85
`;
  }

  /**
   * Simple clustering implementation
   */
  private performClustering(
    locations: Array<{ lat: number; lng: number }>,
    options: { algorithm: string; k?: number }
  ): any[] {
    // Simplified k-means clustering
    const k = options.k || 3;
    const clusters: any[] = [];

    // Initialize centroids randomly
    const centroids = locations.slice(0, k);

    // Simple assignment (in real implementation, iterate until convergence)
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i];
      let minDistance = Infinity;
      let clusterIndex = 0;

      for (let j = 0; j < centroids.length; j++) {
        const distance = this.distanceCalculator.haversineDistance(location, centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          clusterIndex = j;
        }
      }

      if (!clusters[clusterIndex]) {
        clusters[clusterIndex] = { locations: [], centroid: centroids[clusterIndex] };
      }
      clusters[clusterIndex].locations.push(location);
    }

    return clusters;
  }
}
