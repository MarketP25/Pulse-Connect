import { GeocodeProvider, GeocodeResult } from './geocodeProvider';
import { GoogleGeocoder } from './googleGeocoder';
import { OSMGeocoder } from './osmGeocoder';

export class ProviderRouter implements GeocodeProvider {
  private primary: GoogleGeocoder;
  private fallback: OSMGeocoder;
  private healthScores: Map<string, number> = new Map();
  private lastHealthCheck: Map<string, number> = new Map();

  constructor(googleApiKey: string, osmBaseUrl?: string) {
    this.primary = new GoogleGeocoder(googleApiKey);
    this.fallback = new OSMGeocoder(osmBaseUrl);
  }

  async forwardGeocode(params: { address: string; countryCode?: string }): Promise<GeocodeResult> {
    try {
      const result = await this.primary.forwardGeocode(params);
      this.updateHealthScore('google', true);
      return result;
    } catch (error) {
      console.warn('Google geocoding failed, falling back to OSM:', error);
      this.updateHealthScore('google', false);
      return await this.fallback.forwardGeocode(params);
    }
  }

  async reverseGeocode(params: { lat: number; lng: number }): Promise<GeocodeResult> {
    try {
      const result = await this.primary.reverseGeocode(params);
      this.updateHealthScore('google', true);
      return result;
    } catch (error) {
      console.warn('Google reverse geocoding failed, falling back to OSM:', error);
      this.updateHealthScore('google', false);
      return await this.fallback.reverseGeocode(params);
    }
  }

  async isHealthy(): Promise<boolean> {
    const googleHealthy = await this.primary.isHealthy();
    const osmHealthy = await this.fallback.isHealthy();
    return googleHealthy || osmHealthy;
  }

  private updateHealthScore(provider: string, success: boolean): void {
    const current = this.healthScores.get(provider) || 100;
    const newScore = success ? Math.min(100, current + 10) : Math.max(0, current - 20);
    this.healthScores.set(provider, newScore);
    this.lastHealthCheck.set(provider, Date.now());
  }

  getHealthScores(): Record<string, number> {
    return Object.fromEntries(this.healthScores);
  }
}
