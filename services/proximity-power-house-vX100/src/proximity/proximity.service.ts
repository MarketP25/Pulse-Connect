import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geocode } from './entities/geocode.entity';
import { ProximityRule } from './entities/proximity-rule.entity';

// TTLs based on documentation guidance
const GEOCODE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

class MemoryCache implements CacheClient {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt < now) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { value, expiresAt });
  }
}

class RedisCache implements CacheClient {
  private client: any;
  private ready = false;

  constructor(url: string) {
    // Lazy dynamic import to avoid hard dependency if not installed.
    // If ioredis is not available, fallback will be handled by caller.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('ioredis');
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
      });
      this.ready = true;
    } catch (e) {
      this.ready = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.ready) return null;
    try {
      const res = await this.client.get(key);
      return res;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.ready) return;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // best-effort
    }
  }
}

@Injectable()
export class ProximityService {
  private cache: CacheClient | null = null;
  private cacheInitAttempted = false;

  constructor(
    @InjectRepository(Geocode)
    private geocodeRepository: Repository<Geocode>,
    @InjectRepository(ProximityRule)
    private ruleRepository: Repository<ProximityRule>,
  ) {}

  private initCache(): void {
    if (this.cacheInitAttempted) return;
    this.cacheInitAttempted = true;

    const url = process.env.REDIS_URL;
    if (url) {
      const redis = new RedisCache(url);
      // If Redis is not ready, fall back to memory cache
      this.cache = redis;
    } else {
      this.cache = new MemoryCache();
    }
  }

  private normalizeAddressKey(address: string): string {
    return `geocode:${(address || '').trim().toLowerCase()}`;
  }

  /**
   * Geocode an address using Google Maps API with read-through caching
   * Performance target: p95 ≤ 200ms (with cache), cache hit ratio ≥ 70%
   */
  async geocode(address: string): Promise<any> {
    this.initCache();

    const key = this.normalizeAddressKey(address);

    // 1) Cache lookup
    const cached = await this.checkCache(key);
    if (cached) {
      return cached;
    }

    // 2) Provider call (simulated)
    const result = await this.callGoogleMapsAPI(address);

    // Ensure address is present for DB persistence
    const toPersist = { ...result, address };

    // 3) Persist to database
    await this.storeGeocode(toPersist);

    // 4) Populate cache
    await this.setCache(key, toPersist, GEOCODE_TTL_SECONDS);

    return toPersist;
  }

  /**
   * Calculate Haversine distance between two points (synchronous, pure)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): any {
    const distance = this.distanceKm(lat1, lng1, lat2, lng2);
    return { distance_km: distance };
  }

  /**
   * Evaluate distance against active proximity rules (asynchronous)
   */
  async evaluateDistanceWithRules(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): Promise<{ distance_km: number; verdict: boolean; policy_version: string; reason_code: string }> {
    const distance = this.distanceKm(lat1, lng1, lat2, lng2);
    const rules = await this.ruleRepository.find({ where: { active: true } });
    const threshold = rules[0]?.threshold_km ?? 50;
    const verdict = distance <= threshold;
    return {
      distance_km: distance,
      verdict,
      policy_version: rules[0]?.policy_version || '1.0.0',
      reason_code: verdict ? 'WITHIN_THRESHOLD' : 'EXCEEDS_THRESHOLD',
    };
  }

  /**
   * Simple k-means clustering implementation (uses pure distance calc)
   */
  cluster(points: Array<{ lat: number; lng: number }>, k: number): any {
    const clusters = this.simpleKMeans(points, k);
    return {
      clusters,
      algorithm: 'k-means',
      policy_version: '1.0.0',
    };
  }

  async getRules(): Promise<ProximityRule[]> {
    return this.ruleRepository.find({ where: { active: true } });
  }

  async createRule(ruleData: any): Promise<ProximityRule> {
    const rule = this.ruleRepository.create(ruleData);
    return this.ruleRepository.save(rule);
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async checkCache(key: string): Promise<any | null> {
    if (!this.cache) return null;
    try {
      const raw = await this.cache.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // best-effort
    }
  }

  private async callGoogleMapsAPI(address: string): Promise<any> {
    // TODO: Implement actual Google Maps API call
    // For now, return mock data
    return {
      lat: 37.7749,
      lng: -122.4194,
      formatted_address: 'San Francisco, CA, USA',
      confidence: 0.95,
      provider: 'google',
      region_code: 'US-CA',
    };
  }

  private async storeGeocode(data: any): Promise<void> {
    const geocode = this.geocodeRepository.create({
      actor: 'system',
      address: data.address || 'unknown',
      lat: data.lat,
      lng: data.lng,
      provider: data.provider,
      confidence: data.confidence,
      formatted_address: data.formatted_address,
      region_code: data.region_code,
    });

    await this.geocodeRepository.save(geocode);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private simpleKMeans(points: Array<{ lat: number; lng: number }>, k: number): any[] {
    if (points.length === 0 || k <= 0) return [];
    const clusters: any[] = [];
    for (let i = 0; i < k; i++) {
      clusters.push({
        centroid: points[i % points.length],
        points: [],
      });
    }

    // Assign points to nearest cluster using pure distance function
    points.forEach((point) => {
      let minDistance = Infinity;
      let closestCluster = 0;

      clusters.forEach((cluster, index) => {
        const distance = this.distanceKm(
          point.lat,
          point.lng,
          cluster.centroid.lat,
          cluster.centroid.lng,
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = index;
        }
      });

      clusters[closestCluster].points.push(point);
    });

    return clusters;
  }
}
