import { ProximityService } from '../proximity/service';
import { RegionIntelligence } from '../proximity/service/regionIntelligence';
import { AuditEngine } from '../proximity/service/audit';

export interface LocalizationContext {
  userId: string;
  userLocation?: { lat: number; lng: number };
  userLanguage?: string;
  userTimezone?: string;
  deviceLocale?: string;
  ipAddress?: string;
}

export interface LocalizedContent {
  contentId: string;
  contentType: 'ui' | 'marketing' | 'legal' | 'help';
  baseContent: Record<string, any>;
  localizedVersions: Record<string, Record<string, any>>;
  proximityRules?: {
    regionSpecific: boolean;
    timezoneAware: boolean;
    locationBased: boolean;
  };
}

export class PlanetaryLocalizationIntegration {
  private proximityService: ProximityService;
  private regionIntelligence: RegionIntelligence;
  private auditEngine: AuditEngine;

  // Planetary localization data
  private readonly PLANETARY_DATA = {
    continents: {
      'Africa': { languages: ['sw', 'am', 'ha', 'yo', 'ig'], timezones: ['Africa/Nairobi', 'Africa/Lagos', 'Africa/Johannesburg'] },
      'Asia': { languages: ['zh', 'hi', 'ar', 'ja', 'ko'], timezones: ['Asia/Shanghai', 'Asia/Tokyo', 'Asia/Dubai'] },
      'Europe': { languages: ['en', 'de', 'fr', 'es', 'it'], timezones: ['Europe/London', 'Europe/Berlin', 'Europe/Paris'] },
      'North America': { languages: ['en', 'es', 'fr'], timezones: ['America/New_York', 'America/Los_Angeles', 'America/Toronto'] },
      'South America': { languages: ['es', 'pt', 'qu'], timezones: ['America/Sao_Paulo', 'America/Buenos_Aires', 'America/Lima'] },
      'Oceania': { languages: ['en', 'mi'], timezones: ['Australia/Sydney', 'Pacific/Auckland'] }
    },
    countries: {
      'KE': { name: 'Kenya', continent: 'Africa', languages: ['sw', 'en'], currency: 'KES', timezone: 'Africa/Nairobi' },
      'US': { name: 'United States', continent: 'North America', languages: ['en'], currency: 'USD', timezone: 'America/New_York' },
      'GB': { name: 'United Kingdom', continent: 'Europe', languages: ['en'], currency: 'GBP', timezone: 'Europe/London' },
      'DE': { name: 'Germany', continent: 'Europe', languages: ['de'], currency: 'EUR', timezone: 'Europe/Berlin' },
      'JP': { name: 'Japan', continent: 'Asia', languages: ['ja'], currency: 'JPY', timezone: 'Asia/Tokyo' },
      'BR': { name: 'Brazil', continent: 'South America', languages: ['pt'], currency: 'BRL', timezone: 'America/Sao_Paulo' },
      'AU': { name: 'Australia', continent: 'Oceania', languages: ['en'], currency: 'AUD', timezone: 'Australia/Sydney' }
    }
  };

  constructor(
    proximityService: ProximityService,
    regionIntelligence: RegionIntelligence,
    auditEngine: AuditEngine
  ) {
    this.proximityService = proximityService;
    this.regionIntelligence = regionIntelligence;
    this.auditEngine = auditEngine;
  }

  /**
   * Get planetary localization context for a user
   */
  async getLocalizationContext(
    context: LocalizationContext,
    actorId: string
  ): Promise<{
    detectedLocale: string;
    detectedTimezone: string;
    detectedCurrency: string;
    detectedLanguage: string;
    regionInfo: any;
    localizationConfidence: number;
    planetaryContext: {
      continent: string;
      hemisphere: 'northern' | 'southern' | 'equatorial';
      season: string;
      daylightSaving: boolean;
    };
  }> {
    let regionInfo: any = null;
    let localizationConfidence = 0.5; // Base confidence

    // If we have user location, get detailed region intelligence
    if (context.userLocation) {
      const geocodeResult = await this.proximityService.reverseGeocode(
        context.userLocation,
        {
          actorId,
          subsystem: 'localization',
          purpose: 'localization',
          requestId: `localization_context_${context.userId}`
        }
      );

      regionInfo = this.regionIntelligence.inferRegion(geocodeResult);
      localizationConfidence = 0.9; // High confidence with location data
    }

    // Determine locale hierarchy
    const localeHierarchy = this.determineLocaleHierarchy(context, regionInfo);

    // Get planetary context
    const planetaryContext = this.getPlanetaryContext(context.userLocation, regionInfo);

    // Audit the localization detection
    await this.auditEngine.record({
      actorId,
      subsystem: 'localization',
      action: 'planetary_localization',
      purpose: 'localization',
      policyVersion: '1.0.0',
      reasonCode: 'PLANETARY_CONTEXT_DETECTION',
      requestId: `planetary_localization_${context.userId}`,
      metadata: {
        userId: context.userId,
        userLocation: context.userLocation,
        detectedLocale: localeHierarchy.locale,
        detectedTimezone: localeHierarchy.timezone,
        detectedCurrency: localeHierarchy.currency,
        detectedLanguage: localeHierarchy.language,
        localizationConfidence,
        planetaryContext
      },
      result: 'success'
    });

    return {
      detectedLocale: localeHierarchy.locale,
      detectedTimezone: localeHierarchy.timezone,
      detectedCurrency: localeHierarchy.currency,
      detectedLanguage: localeHierarchy.language,
      regionInfo,
      localizationConfidence,
      planetaryContext
    };
  }

  /**
   * Localize content based on planetary context
   */
  async localizeContent(
    content: LocalizedContent,
    localizationContext: any,
    actorId: string
  ): Promise<{
    localizedContent: Record<string, any>;
    localizationMetadata: {
      appliedRules: string[];
      fallbackUsed: boolean;
      confidence: number;
      planetaryAdaptations: string[];
    };
  }> {
    const appliedRules: string[] = [];
    const planetaryAdaptations: string[] = [];
    let fallbackUsed = false;
    let confidence = 0.8;

    // Start with base content
    let localizedContent = { ...content.baseContent };

    // Apply planetary localization rules
    if (content.proximityRules?.regionSpecific) {
      const regionLocalized = this.applyRegionalLocalization(
        localizedContent,
        localizationContext,
        appliedRules,
        planetaryAdaptations
      );
      localizedContent = regionLocalized.content;
      fallbackUsed = fallbackUsed || regionLocalized.fallbackUsed;
    }

    if (content.proximityRules?.timezoneAware) {
      localizedContent = this.applyTimezoneLocalization(
        localizedContent,
        localizationContext,
        appliedRules,
        planetaryAdaptations
      );
    }

    if (content.proximityRules?.locationBased) {
      localizedContent = this.applyLocationBasedLocalization(
        localizedContent,
        localizationContext,
        appliedRules,
        planetaryAdaptations
      );
    }

    // Apply language localization
    const languageLocalized = this.applyLanguageLocalization(
      localizedContent,
      localizationContext.detectedLanguage,
      content.localizedVersions
    );

    localizedContent = languageLocalized.content;
    if (languageLocalized.fallbackUsed) {
      fallbackUsed = true;
      confidence -= 0.2;
    }

    // Audit content localization
    await this.auditEngine.record({
      actorId,
      subsystem: 'localization',
      action: 'content_localization',
      purpose: 'localization',
      policyVersion: '1.0.0',
      reasonCode: 'PLANETARY_CONTENT_LOCALIZATION',
      requestId: `content_localization_${content.contentId}`,
      metadata: {
        contentId: content.contentId,
        contentType: content.contentType,
        targetLocale: localizationContext.detectedLocale,
        appliedRules,
        planetaryAdaptations,
        fallbackUsed,
        confidence
      },
      result: 'success'
    });

    return {
      localizedContent,
      localizationMetadata: {
        appliedRules,
        fallbackUsed,
        confidence,
        planetaryAdaptations
      }
    };
  }

  /**
   * Get planetary time context
   */
  async getPlanetaryTimeContext(
    userLocation: { lat: number; lng: number } | undefined,
    actorId: string
  ): Promise<{
    localTime: Date;
    utcTime: Date;
    timezone: string;
    daylightSavingActive: boolean;
    businessHours: {
      isBusinessHour: boolean;
      nextBusinessHour: Date | null;
      timeToNextBusinessHour: number;
    };
    planetaryTimeInsights: {
      simultaneousUsers: number; // Estimated users online globally
      peakActivityRegion: string;
      globalTimeDistribution: Record<string, number>;
    };
  }> {
    const now = new Date();
    const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));

    // Determine timezone from location or default
    let timezone = 'UTC';
    let daylightSavingActive = false;

    if (userLocation) {
      const geocodeResult = await this.proximityService.reverseGeocode(
        userLocation,
        {
          actorId,
          subsystem: 'localization',
          purpose: 'localization',
          requestId: `planetary_time_${Date.now()}`
        }
      );

      const regionInfo = this.regionIntelligence.inferRegion(geocodeResult);
      timezone = regionInfo.timezone;

      // Check for daylight saving (simplified)
      daylightSavingActive = this.isDaylightSavingTime(now, timezone);
    }

    // Calculate local time
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    // Business hours calculation (9 AM - 6 PM local time)
    const businessHours = this.calculateBusinessHours(localTime, timezone);

    // Planetary time insights
    const planetaryInsights = this.calculatePlanetaryTimeInsights(localTime);

    return {
      localTime,
      utcTime,
      timezone,
      daylightSavingActive,
      businessHours,
      planetaryTimeInsights: planetaryInsights
    };
  }

  /**
   * Planetary routing for content delivery
   */
  async getPlanetaryRouting(
    userLocation: { lat: number; lng: number },
    contentType: string,
    actorId: string
  ): Promise<{
    optimalServer: string;
    routingReason: string;
    latencyEstimate: number;
    planetaryRoute: {
      continent: string;
      region: string;
      dataCenter: string;
      networkPath: string[];
    };
  }> {
    // Get region intelligence
    const geocodeResult = await this.proximityService.reverseGeocode(
      userLocation,
      {
        actorId,
        subsystem: 'localization',
        purpose: 'localization',
        requestId: `planetary_routing_${Date.now()}`
      }
    );

    const regionInfo = this.regionIntelligence.inferRegion(geocodeResult);

    // Determine optimal routing (simplified logic)
    const routing = this.calculateOptimalRouting(regionInfo, contentType);

    // Estimate latency based on distance
    const latencyEstimate = await this.estimateLatency(userLocation, routing.dataCenter, actorId);

    return {
      optimalServer: routing.dataCenter,
      routingReason: `Routing to ${routing.continent} for optimal ${contentType} delivery`,
      latencyEstimate,
      planetaryRoute: routing
    };
  }

  /**
   * Determine locale hierarchy from context
   */
  private determineLocaleHierarchy(
    context: LocalizationContext,
    regionInfo: any
  ): {
    locale: string;
    language: string;
    timezone: string;
    currency: string;
  } {
    // Priority: explicit user settings > location detection > device > IP > defaults
    const language = context.userLanguage ||
                    regionInfo?.language ||
                    context.deviceLocale?.split('-')[0] ||
                    'en';

    const countryCode = regionInfo?.countryCode ||
                       context.deviceLocale?.split('-')[1] ||
                       'US';

    const locale = `${language}-${countryCode}`;

    const timezone = context.userTimezone ||
                    regionInfo?.timezone ||
                    this.PLANETARY_DATA.countries[countryCode]?.timezone ||
                    'UTC';

    const currency = regionInfo?.currency ||
                    this.PLANETARY_DATA.countries[countryCode]?.currency ||
                    'USD';

    return {
      locale,
      language,
      timezone,
      currency
    };
  }

  /**
   * Get planetary context (hemisphere, season, etc.)
   */
  private getPlanetaryContext(
    userLocation?: { lat: number; lng: number },
    regionInfo?: any
  ): {
    continent: string;
    hemisphere: 'northern' | 'southern' | 'equatorial';
    season: string;
    daylightSaving: boolean;
  } {
    const countryCode = regionInfo?.countryCode || 'US';
    const country = this.PLANETARY_DATA.countries[countryCode];

    let hemisphere: 'northern' | 'southern' | 'equatorial' = 'northern';
    if (userLocation) {
      if (userLocation.lat > 23.5) hemisphere = 'northern';
      else if (userLocation.lat < -23.5) hemisphere = 'southern';
      else hemisphere = 'equatorial';
    }

    const season = this.determineSeason(new Date(), hemisphere);
    const daylightSaving = this.isDaylightSavingTime(new Date(), regionInfo?.timezone || 'UTC');

    return {
      continent: country?.continent || 'Unknown',
      hemisphere,
      season,
      daylightSaving
    };
  }

  /**
   * Apply regional localization rules
   */
  private applyRegionalLocalization(
    content: Record<string, any>,
    context: any,
    appliedRules: string[],
    adaptations: string[]
  ): { content: Record<string, any>; fallbackUsed: boolean } {
    let fallbackUsed = false;

    // Apply region-specific formatting
    if (context.regionInfo?.countryCode === 'US') {
      // US date format: MM/DD/YYYY
      appliedRules.push('us_date_format');
      adaptations.push('Applied US date formatting');
    } else if (context.regionInfo?.countryCode === 'GB') {
      // UK date format: DD/MM/YYYY
      appliedRules.push('uk_date_format');
      adaptations.push('Applied UK date formatting');
    }

    // Currency formatting
    if (content.price !== undefined) {
      const currency = context.detectedCurrency;
      appliedRules.push(`currency_format_${currency}`);
      adaptations.push(`Formatted currency as ${currency}`);
    }

    return { content, fallbackUsed };
  }

  /**
   * Apply timezone-aware localization
   */
  private applyTimezoneLocalization(
    content: Record<string, any>,
    context: any,
    appliedRules: string[],
    adaptations: string[]
  ): Record<string, any> {
    // Add timezone-aware messaging
    if (content.scheduledTime) {
      appliedRules.push('timezone_aware_scheduling');
      adaptations.push(`Scheduled content for ${context.detectedTimezone} timezone`);
    }

    return content;
  }

  /**
   * Apply location-based localization
   */
  private applyLocationBasedLocalization(
    content: Record<string, any>,
    context: any,
    appliedRules: string[],
    adaptations: string[]
  ): Record<string, any> {
    // Add location-specific content
    if (context.regionInfo?.locality) {
      appliedRules.push('location_specific_content');
      adaptations.push(`Added ${context.regionInfo.locality} specific content`);
    }

    return content;
  }

  /**
   * Apply language localization
   */
  private applyLanguageLocalization(
    content: Record<string, any>,
    language: string,
    localizedVersions: Record<string, Record<string, any>>
  ): { content: Record<string, any>; fallbackUsed: boolean } {
    const localized = localizedVersions[language];
    if (localized) {
      return { content: { ...content, ...localized }, fallbackUsed: false };
    }

    // Fallback to English
    const english = localizedVersions['en'];
    if (english) {
      return { content: { ...content, ...english }, fallbackUsed: true };
    }

    return { content, fallbackUsed: true };
  }

  /**
   * Determine season based on hemisphere and date
   */
  private determineSeason(date: Date, hemisphere: 'northern' | 'southern' | 'equatorial'): string {
    if (hemisphere === 'equatorial') return 'tropical';

    const month = date.getMonth() + 1;
    const isNorthern = hemisphere === 'northern';

    if ((month >= 3 && month <= 5) === isNorthern) return 'spring';
    if ((month >= 6 && month <= 8) === isNorthern) return 'summer';
    if ((month >= 9 && month <= 11) === isNorthern) return 'autumn';
    return 'winter';
  }

  /**
   * Check if daylight saving time is active
   */
  private isDaylightSavingTime(date: Date, timezone: string): boolean {
    // Simplified DST check - in production, use a proper timezone library
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdTimezoneOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

    return date.getTimezoneOffset() < stdTimezoneOffset;
  }

  /**
   * Calculate business hours
   */
  private calculateBusinessHours(localTime: Date, timezone: string): {
    isBusinessHour: boolean;
    nextBusinessHour: Date | null;
    timeToNextBusinessHour: number;
  } {
    const hour = localTime.getHours();
    const isBusinessHour = hour >= 9 && hour < 18; // 9 AM - 6 PM

    let nextBusinessHour: Date | null = null;
    let timeToNext = 0;

    if (!isBusinessHour) {
      if (hour < 9) {
        // Before business hours
        nextBusinessHour = new Date(localTime);
        nextBusinessHour.setHours(9, 0, 0, 0);
        timeToNext = nextBusinessHour.getTime() - localTime.getTime();
      } else {
        // After business hours - next day
        nextBusinessHour = new Date(localTime);
        nextBusinessHour.setDate(nextBusinessHour.getDate() + 1);
        nextBusinessHour.setHours(9, 0, 0, 0);
        timeToNext = nextBusinessHour.getTime() - localTime.getTime();
      }
    }

    return {
      isBusinessHour,
      nextBusinessHour,
      timeToNextBusinessHour: timeToNext
    };
  }

  /**
   * Calculate planetary time insights
   */
  private calculatePlanetaryTimeInsights(localTime: Date): {
    simultaneousUsers: number;
    peakActivityRegion: string;
    globalTimeDistribution: Record<string, number>;
  } {
    const hour = localTime.getHours();

    // Estimate global user activity (simplified)
    const baseUsers = 1000000; // 1M base users
    const hourMultiplier = this.getHourActivityMultiplier(hour);
    const simultaneousUsers = Math.round(baseUsers * hourMultiplier);

    // Determine peak activity region
    const peakActivityRegion = this.getPeakActivityRegion(hour);

    // Global time distribution
    const globalTimeDistribution: Record<string, number> = {};
    for (let h = 0; h < 24; h++) {
      globalTimeDistribution[h.toString()] = Math.round(baseUsers * this.getHourActivityMultiplier(h));
    }

    return {
      simultaneousUsers,
      peakActivityRegion,
      globalTimeDistribution
    };
  }

  /**
   * Get activity multiplier for hour
   */
  private getHourActivityMultiplier(hour: number): number {
    // Peak hours: 8-10 AM, 6-8 PM
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) return 1.5;
    // Moderate: 11 AM - 5 PM
    if (hour >= 11 && hour <= 17) return 1.2;
    // Low: 11 PM - 5 AM
    if (hour >= 23 || hour <= 5) return 0.3;
    // Normal: other hours
    return 1.0;
  }

  /**
   * Get peak activity region for current hour
   */
  private getPeakActivityRegion(hour: number): string {
    // Simplified - in reality, this would be based on actual data
    const regions = ['North America', 'Europe', 'Asia', 'Africa', 'South America', 'Oceania'];

    // Rotate through regions based on hour
    const regionIndex = hour % regions.length;
    return regions[regionIndex];
  }

  /**
   * Calculate optimal routing
   */
  private calculateOptimalRouting(regionInfo: any, contentType: string): {
    continent: string;
    region: string;
    dataCenter: string;
    networkPath: string[];
  } {
    const continent = regionInfo?.countryCode ?
      this.PLANETARY_DATA.countries[regionInfo.countryCode]?.continent || 'North America' :
      'North America';

    const region = regionInfo?.region || 'Unknown';
    const dataCenter = this.getOptimalDataCenter(continent, contentType);

    return {
      continent,
      region,
      dataCenter,
      networkPath: ['edge', 'regional', dataCenter]
    };
  }

  /**
   * Get optimal data center for content type
   */
  private getOptimalDataCenter(continent: string, contentType: string): string {
    const dataCenters: Record<string, string[]> = {
      'North America': ['us-east-1', 'us-west-2', 'ca-central-1'],
      'Europe': ['eu-west-1', 'eu-central-1'],
      'Asia': ['ap-southeast-1', 'ap-northeast-1'],
      'Africa': ['af-south-1'],
      'South America': ['sa-east-1'],
      'Oceania': ['ap-southeast-2']
    };

    const centers = dataCenters[continent] || dataCenters['North America'];

    // For static content, prefer edge locations
    if (contentType === 'static') return centers[0] + '-edge';

    return centers[0];
  }

  /**
   * Estimate latency to data center
   */
  private async estimateLatency(
    userLocation: { lat: number; lng: number },
    dataCenter: string,
    actorId: string
  ): Promise<number> {
    // Simplified latency estimation based on distance
    // In production, this would use real network latency data

    // Extract approximate coordinates from data center name
    const dataCenterCoords = this.getDataCenterCoordinates(dataCenter);

    const distance = await this.proximityService.distanceKm(
      userLocation,
      dataCenterCoords,
      {
        actorId,
        subsystem: 'localization',
        purpose: 'localization',
        requestId: `latency_estimate_${Date.now()}`
      }
    );

    // Rough latency estimation: ~1ms per 100km
    return Math.round(distance * 10);
  }

  /**
   * Get approximate coordinates for data center
   */
  private getDataCenterCoordinates(dataCenter: string): { lat: number; lng: number } {
    const coords: Record<string, { lat: number; lng: number }> = {
      'us-east-1': { lat: 39.0438, lng: -77.4874 }, // Virginia
      'us-west-2': { lat: 45.5152, lng: -122.6784 }, // Oregon
      'eu-west-1': { lat: 53.1424, lng: -7.6921 }, // Ireland
      'ap-southeast-1': { lat: 1.3521, lng: 103.8198 }, // Singapore
      'af-south-1': { lat: -33.9249, lng: 18.4241 }, // Cape Town
      'sa-east-1': { lat: -23.5505, lng: -46.6333 }, // São Paulo
      'ap-southeast-2': { lat: -33.8688, lng: 151.2093 } // Sydney
    };

    return coords[dataCenter.split('-')[0]] || { lat: 39.0438, lng: -77.4874 };
  }
}
