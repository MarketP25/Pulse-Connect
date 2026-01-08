export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  countryCode?: string;
  region?: string;
  locality?: string;
  postalCode?: string;
  precision: 'exact' | 'approximate' | 'rooftop' | 'geometric_center';
}

export interface GeocodeProvider {
  forwardGeocode(params: { address: string; countryCode?: string }): Promise<GeocodeResult>;
  reverseGeocode(params: { lat: number; lng: number }): Promise<GeocodeResult>;
  isHealthy(): Promise<boolean>;
}
