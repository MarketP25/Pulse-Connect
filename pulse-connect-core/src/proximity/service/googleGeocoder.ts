import { GeocodeProvider, GeocodeResult } from './geocodeProvider';

export class GoogleGeocoder implements GeocodeProvider {
  private apiKey: string;
  private baseUrl: string = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async forwardGeocode(params: { address: string; countryCode?: string }): Promise<GeocodeResult> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('address', params.address);
    url.searchParams.set('key', this.apiKey);

    if (params.countryCode) {
      url.searchParams.set('components', `country:${params.countryCode}`);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Google Geocoding failed: ${data.status}`);
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
      address: result.formatted_address,
      countryCode: this.extractComponent(result.address_components, 'country', 'short_name'),
      region: this.extractComponent(result.address_components, 'administrative_area_level_1', 'long_name'),
      locality: this.extractComponent(result.address_components, 'locality', 'long_name') ||
                this.extractComponent(result.address_components, 'administrative_area_level_2', 'long_name'),
      postalCode: this.extractComponent(result.address_components, 'postal_code', 'long_name'),
      precision: this.getPrecision(result.geometry.location_type)
    };
  }

  async reverseGeocode(params: { lat: number; lng: number }): Promise<GeocodeResult> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('latlng', `${params.lat},${params.lng}`);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Google Reverse Geocoding failed: ${data.status}`);
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
      address: result.formatted_address,
      countryCode: this.extractComponent(result.address_components, 'country', 'short_name'),
      region: this.extractComponent(result.address_components, 'administrative_area_level_1', 'long_name'),
      locality: this.extractComponent(result.address_components, 'locality', 'long_name') ||
                this.extractComponent(result.address_components, 'administrative_area_level_2', 'long_name'),
      postalCode: this.extractComponent(result.address_components, 'postal_code', 'long_name'),
      precision: this.getPrecision(result.geometry.location_type)
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
      await this.forwardGeocode({ address: testAddress });
      return true;
    } catch {
      return false;
    }
  }

  private extractComponent(components: any[], type: string, field: 'long_name' | 'short_name'): string | undefined {
    const component = components.find(comp => comp.types.includes(type));
    return component?.[field];
  }

  private getPrecision(locationType: string): 'exact' | 'approximate' | 'rooftop' | 'geometric_center' {
    switch (locationType) {
      case 'ROOFTOP':
        return 'rooftop';
      case 'RANGE_INTERPOLATED':
      case 'GEOMETRIC_CENTER':
        return 'geometric_center';
      case 'APPROXIMATE':
        return 'approximate';
      default:
        return 'exact';
    }
  }
}
