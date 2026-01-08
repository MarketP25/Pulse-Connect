/**
 * Utility functions for proximity service
 */

export interface NormalizedAddress {
  canonical: string;
  components: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

/**
 * Normalize and canonicalize address for consistent caching
 */
export function normalizeAddress(address: string): NormalizedAddress {
  // Unicode fold to handle special characters
  let normalized = address.normalize('NFKD');

  // Trim and collapse whitespace
  normalized = normalized.trim().replace(/\s+/g, ' ');

  // Lowercase except country/locality codes (simplified)
  normalized = normalized.toLowerCase();

  // Extract components (simplified regex-based extraction)
  const postalCodeMatch = normalized.match(/\b\d{5}(?:-\d{4})?\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : undefined;

  // Remove postal code from address for canonical form
  const withoutPostal = postalCode ? normalized.replace(postalCode, '').trim() : normalized;

  return {
    canonical: withoutPostal,
    components: {
      postalCode
    }
  };
}

/**
 * Generate cache key for geocoding
 */
export function generateGeocodeKey(address: string): string {
  const normalized = normalizeAddress(address);
  return `GEOCODE:${normalized.canonical}`;
}

/**
 * Generate cache key for reverse geocoding
 */
export function generateReverseGeocodeKey(lat: number, lng: number): string {
  // Round to 6 decimal places for reasonable precision
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  return `REVERSE:${latStr}:${lngStr}`;
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculate bounding box for radius search
 */
export function calculateBoundingBox(centerLat: number, centerLng: number, radiusKm: number): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const earthRadiusKm = 6371;

  // Convert radius to angular distance
  const angularRadius = radiusKm / earthRadiusKm;

  const minLat = Math.max(-90, centerLat - angularRadius * (180 / Math.PI));
  const maxLat = Math.min(90, centerLat + angularRadius * (180 / Math.PI));

  // For longitude, adjust based on latitude
  const latRad = centerLat * (Math.PI / 180);
  const lngRadius = angularRadius / Math.cos(latRad);

  const minLng = centerLng - lngRadius * (180 / Math.PI);
  const maxLng = centerLng + lngRadius * (180 / Math.PI);

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= this.limit) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);

    return Math.max(0, this.limit - recentRequests.length);
  }
}

/**
 * Exponential backoff utility
 */
export class ExponentialBackoff {
  private baseDelay: number;
  private maxDelay: number;
  private multiplier: number;

  constructor(baseDelay: number = 200, maxDelay: number = 30000, multiplier: number = 2) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.multiplier = multiplier;
  }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(this.multiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Performance metrics utility
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();

  record(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);

    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }

    this.metrics.set(name, values);
  }

  getPercentile(name: string, percentile: number): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;

    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getCount(name: string): number {
    return this.metrics.get(name)?.length || 0;
  }
}
