import { GeocodeProvider, GeocodeResult } from './geocodeProvider';

export class OSMGeocoder implements GeocodeProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://nominatim.openstreetmap.org') {
    this.baseUrl = baseUrl;
  }

  async forwardGeocode(params: { address: string; countryCode?: string }): Promise<GeocodeResult> {
    let url = `${this.baseUrl}/search?format=json&q=${encodeURIComponent(params.address)}&limit=1`;
    if (params.countryCode) {
      url += `&countrycodes=${params.countryCode}`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Pulsco-Proximity/1.0'
      }
    });
    const data = await response.json();

    if (!data.length) {
      throw new Error('OSM Geocoding failed: No results');
    }

    const result = data[0];

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
      countryCode: result.address?.country_code?.toUpperCase(),
      region: result.address?.state,
      locality: result.address?.city || result.address?.town || result.address?.village,
      postalCode: result.address?.postcode,
      precision: 'approximate'
    };
  }

  async reverseGeocode(params: { lat: number; lng: number }): Promise<GeocodeResult> {
    const url = `${this.baseUrl}/reverse?format=json&lat=${params.lat}&lon=${params.lng}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Pulsco-Proximity/1.0'
      }
    });
    const data = await response.json();

    if (data.error) {
      throw new Error(`OSM Reverse Geocoding failed: ${data.error}`);
    }

    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      address: data.display_name,
      countryCode: data.address?.country_code?.toUpperCase(),
      region: data.address?.state,
      locality: data.address?.city || data.address?.town || data.address?.village,
      postalCode: data.address?.postcode,
      precision: 'approximate'
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/search?format=json&q=New+York&limit=1`, {
        headers: {
          'User-Agent': 'Pulsco-Proximity/1.0'
        }
      });
      const data = await response.json();
      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }
}
