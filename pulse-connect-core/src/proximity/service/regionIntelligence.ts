import { GeocodeResult } from './geocodeProvider';

export interface RegionInfo {
  countryCode: string;
  region: string;
  locality: string;
  timezone: string;
  currency: string;
  locale: string;
  language: string;
}

export class RegionIntelligence {
  private countryData: Map<string, any> = new Map();

  constructor() {
    // Initialize with basic country data
    this.initializeCountryData();
  }

  /**
   * Infer region information from geocode result
   */
  inferRegion(geocode: GeocodeResult): RegionInfo {
    const countryCode = geocode.countryCode || 'US';
    const region = geocode.region || '';
    const locality = geocode.locality || '';

    const countryInfo = this.countryData.get(countryCode) || this.countryData.get('US');

    return {
      countryCode,
      region,
      locality,
      timezone: this.inferTimezone(countryCode, region),
      currency: countryInfo?.currency || 'USD',
      locale: countryInfo?.locale || 'en-US',
      language: countryInfo?.language || 'en'
    };
  }

  /**
   * Get marketing region for targeted campaigns
   */
  getMarketingRegion(regionInfo: RegionInfo): string {
    // Group countries into marketing regions
    const marketingRegions: Record<string, string> = {
      'US': 'North America',
      'CA': 'North America',
      'MX': 'North America',
      'GB': 'Europe',
      'DE': 'Europe',
      'FR': 'Europe',
      'IT': 'Europe',
      'ES': 'Europe',
      'NL': 'Europe',
      'BE': 'Europe',
      'CH': 'Europe',
      'AT': 'Europe',
      'SE': 'Europe',
      'NO': 'Europe',
      'DK': 'Europe',
      'FI': 'Europe',
      'PL': 'Europe',
      'CZ': 'Europe',
      'HU': 'Europe',
      'RO': 'Europe',
      'BG': 'Europe',
      'GR': 'Europe',
      'PT': 'Europe',
      'IE': 'Europe',
      'JP': 'Asia Pacific',
      'KR': 'Asia Pacific',
      'CN': 'Asia Pacific',
      'HK': 'Asia Pacific',
      'SG': 'Asia Pacific',
      'AU': 'Asia Pacific',
      'NZ': 'Asia Pacific',
      'IN': 'Asia Pacific',
      'TH': 'Asia Pacific',
      'MY': 'Asia Pacific',
      'ID': 'Asia Pacific',
      'PH': 'Asia Pacific',
      'VN': 'Asia Pacific',
      'TW': 'Asia Pacific',
      'BR': 'Latin America',
      'AR': 'Latin America',
      'CL': 'Latin America',
      'CO': 'Latin America',
      'PE': 'Latin America',
      'VE': 'Latin America',
      'EC': 'Latin America',
      'UY': 'Latin America',
      'PY': 'Latin America',
      'BO': 'Latin America',
      'ZA': 'Africa',
      'NG': 'Africa',
      'EG': 'Africa',
      'KE': 'Africa',
      'MA': 'Africa',
      'TN': 'Africa',
      'GH': 'Africa',
      'CI': 'Africa',
      'SN': 'Africa',
      'UG': 'Africa'
    };

    return marketingRegions[regionInfo.countryCode] || 'Global';
  }

  /**
   * Check if region requires RTL support
   */
  requiresRTL(regionInfo: RegionInfo): boolean {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
    return rtlLanguages.includes(regionInfo.language);
  }

  /**
   * Get fraud risk score based on region
   */
  getFraudRiskScore(regionInfo: RegionInfo): number {
    // Higher risk for certain regions (simplified)
    const highRiskCountries = ['NG', 'GH', 'KE', 'ZA', 'BR', 'MX', 'IN', 'PH', 'VN', 'ID'];
    const mediumRiskCountries = ['CN', 'RU', 'TR', 'EG', 'MA', 'TN', 'CO', 'PE', 'AR', 'CL'];

    if (highRiskCountries.includes(regionInfo.countryCode)) return 0.8;
    if (mediumRiskCountries.includes(regionInfo.countryCode)) return 0.5;
    return 0.1; // Low risk
  }

  private inferTimezone(countryCode: string, region: string): string {
    const timezoneMap: Record<string, string> = {
      'US': region === 'California' || region === 'Nevada' || region === 'Washington' ? 'America/Los_Angeles' :
            region === 'Arizona' ? 'America/Phoenix' :
            region === 'New York' || region === 'New Jersey' || region === 'Connecticut' ? 'America/New_York' :
            'America/Chicago',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'JP': 'Asia/Tokyo',
      'CN': 'Asia/Shanghai',
      'IN': 'Asia/Kolkata',
      'AU': 'Australia/Sydney',
      'BR': 'America/Sao_Paulo',
      'CA': region === 'British Columbia' ? 'America/Vancouver' :
            region === 'Ontario' ? 'America/Toronto' :
            'America/Montreal',
      'KE': 'Africa/Nairobi',
      'ZA': 'Africa/Johannesburg',
      'NG': 'Africa/Lagos'
    };

    return timezoneMap[countryCode] || 'UTC';
  }

  private initializeCountryData(): void {
    // Basic country data - in production, this would come from a database
    this.countryData.set('US', { currency: 'USD', locale: 'en-US', language: 'en' });
    this.countryData.set('GB', { currency: 'GBP', locale: 'en-GB', language: 'en' });
    this.countryData.set('DE', { currency: 'EUR', locale: 'de-DE', language: 'de' });
    this.countryData.set('FR', { currency: 'EUR', locale: 'fr-FR', language: 'fr' });
    this.countryData.set('JP', { currency: 'JPY', locale: 'ja-JP', language: 'ja' });
    this.countryData.set('CN', { currency: 'CNY', locale: 'zh-CN', language: 'zh' });
    this.countryData.set('IN', { currency: 'INR', locale: 'hi-IN', language: 'hi' });
    this.countryData.set('BR', { currency: 'BRL', locale: 'pt-BR', language: 'pt' });
    this.countryData.set('CA', { currency: 'CAD', locale: 'en-CA', language: 'en' });
    this.countryData.set('AU', { currency: 'AUD', locale: 'en-AU', language: 'en' });
    this.countryData.set('KE', { currency: 'KES', locale: 'en-KE', language: 'en' });
    this.countryData.set('ZA', { currency: 'ZAR', locale: 'en-ZA', language: 'en' });
    this.countryData.set('NG', { currency: 'NGN', locale: 'en-NG', language: 'en' });
  }
}
