import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface ProximityGeocodingRequest {
  requestId: string;
  userId: string;
  action: "geocode" | "reverse_geocode" | "proximity_search" | "distance_calc";
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  context?: {
    radius?: number;
    maxResults?: number;
    filters?: string[];
  };
}

export interface ProximityGeocodingResponse {
  requestId: string;
  allowed: boolean;
  blockedReason?: string;
  locationData?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    results?: any[];
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class ProximityGeocodingAdapter {
  private readonly logger = new Logger(ProximityGeocodingAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process proximity/geocoding request through Edge governance
   */
  async processProximityGeocodingRequest(
    request: ProximityGeocodingRequest
  ): Promise<ProximityGeocodingResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate location data and permissions
      const locationCheck = await this.validateLocationData(request);
      if (!locationCheck.allowed) {
        await this.telemetryService.recordEvent("proximity_blocked", {
          requestId: request.requestId,
          userId: request.userId,
          action: request.action,
          reason: locationCheck.blockedReason
        });
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: locationCheck.blockedReason,
          complianceFlags: locationCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check privacy and consent for location sharing
      const privacyCheck = await this.checkLocationPrivacy(request);
      if (!privacyCheck.allowed) {
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: privacyCheck.blockedReason,
          complianceFlags: privacyCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Apply rate limiting for geocoding requests
      const rateCheck = await this.checkGeocodingRateLimits(request.userId);
      if (!rateCheck.allowed) {
        return {
          requestId: request.requestId,
          allowed: false,
          blockedReason: "Rate limit exceeded for geocoding requests",
          complianceFlags: ["rate_limited"],
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute geocoding operation
      const result = await this.executeGeocodingOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("proximity_operation", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        allowed: true,
        complianceFlags: [...locationCheck.flags, ...privacyCheck.flags].length,
        processingTime: Date.now() - startTime
      });

      return {
        requestId: request.requestId,
        allowed: true,
        locationData: result.locationData,
        complianceFlags: [...locationCheck.flags, ...privacyCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Proximity geocoding failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("proximity_error", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        requestId: request.requestId,
        allowed: false,
        blockedReason: "System error during geocoding",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate location data
   */
  private async validateLocationData(request: ProximityGeocodingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.action === "geocode" || request.action === "reverse_geocode") {
      if (!request.location) {
        return {
          allowed: false,
          blockedReason: "Location data required",
          flags: ["missing_location"]
        };
      }

      // Validate coordinates
      if (
        request.location.latitude < -90 ||
        request.location.latitude > 90 ||
        request.location.longitude < -180 ||
        request.location.longitude > 180
      ) {
        return {
          allowed: false,
          blockedReason: "Invalid coordinates",
          flags: ["invalid_coordinates"]
        };
      }

      flags.push("coordinates_valid");
    }

    // Validate search parameters
    if (request.action === "proximity_search") {
      if (!request.context?.radius || request.context.radius <= 0) {
        return {
          allowed: false,
          blockedReason: "Invalid search radius",
          flags: ["invalid_radius"]
        };
      }
      flags.push("search_params_valid");
    }

    flags.push("location_data_valid");
    return { allowed: true, flags };
  }

  /**
   * Check location privacy and consent
   */
  private async checkLocationPrivacy(request: ProximityGeocodingRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check user's location sharing consent
    const consentGranted = await this.checkLocationConsent(request.userId);
    if (!consentGranted) {
      return {
        allowed: false,
        blockedReason: "Location sharing consent not granted",
        flags: ["consent_denied"]
      };
    }

    flags.push("consent_granted");

    // Check for restricted areas
    if (request.location) {
      const restricted = await this.checkRestrictedAreas(request.location);
      if (restricted) {
        return {
          allowed: false,
          blockedReason: "Location in restricted area",
          flags: ["restricted_area"]
        };
      }
    }

    flags.push("privacy_compliant");
    return { allowed: true, flags };
  }

  /**
   * Check geocoding rate limits
   */
  private async checkGeocodingRateLimits(userId: string): Promise<{ allowed: boolean }> {
    // Would check Redis rate limit counters
    return { allowed: true }; // Simplified
  }

  /**
   * Execute geocoding operation
   */
  private async executeGeocodingOperation(request: ProximityGeocodingRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("proximity.execute", {
        requestId: request.requestId,
        userId: request.userId,
        action: request.action,
        location: request.location,
        context: request.context,
        edgeValidated: true,
        timestamp: new Date().toISOString()
      })
      .toPromise();

    return result;
  }

  /**
   * Check location consent
   */
  private async checkLocationConsent(userId: string): Promise<boolean> {
    // Would check user's privacy settings
    return true; // Simplified
  }

  /**
   * Check for restricted areas
   */
  private async checkRestrictedAreas(location: {
    latitude: number;
    longitude: number;
  }): Promise<boolean> {
    // Would check against restricted area database
    return false; // Simplified
  }
}
