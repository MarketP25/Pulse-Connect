import { Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EdgeTelemetryService } from '../services/telemetry.service';
import { AiRuleInterpreter } from '@/shared/lib/src/ai-rule-interpreter';

export interface PlacesRequest {
  venueId: string;
  userId: string;
  regionCode: string;
  action: 'check_in' | 'book' | 'info' | 'review' | 'report';
  location?: {
    latitude: number;
    longitude: number;
  };
  context?: {
    partySize?: number;
    dateTime?: string;
    specialRequests?: string[];
  };
}

export interface PlacesResponse {
  venueId: string;
  allowed: boolean;
  blockedReason?: string;
  venueData?: {
    name: string;
    address: string;
    operatingHours: any;
    capacity: number;
    currentOccupancy: number;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class PlacesAdapter {
  private readonly logger = new Logger(PlacesAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter,
  ) {}

  /**
   * Process places/venues request through Edge governance
   */
  async processPlacesRequest(request: PlacesRequest): Promise<PlacesResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate venue operating status and regional compliance
      const venueCheck = await this.validateVenueStatus(request);
      if (!venueCheck.allowed) {
        await this.telemetryService.recordEvent('places_blocked', {
          venueId: request.venueId,
          userId: request.userId,
          action: request.action,
          reason: venueCheck.blockedReason,
          regionCode: request.regionCode,
        });
        return {
          venueId: request.venueId,
          allowed: false,
          blockedReason: venueCheck.blockedReason,
          complianceFlags: venueCheck.flags,
          processingTime: Date.now() - startTime,
        };
      }

      // 2. Check user location and geofencing
      const locationCheck = await this.validateLocationCompliance(request);
      if (!locationCheck.allowed) {
        return {
          venueId: request.venueId,
          allowed: false,
          blockedReason: locationCheck.blockedReason,
          complianceFlags: locationCheck.flags,
          processingTime: Date.now() - startTime,
        };
      }

      // 3. Apply capacity and booking rules
      const capacityCheck = await this.validateCapacityRules(request);
      if (!capacityCheck.allowed) {
        return {
          venueId: request.venueId,
          allowed: false,
          blockedReason: capacityCheck.blockedReason,
          complianceFlags: capacityCheck.flags,
          processingTime: Date.now() - startTime,
        };
      }

      // 4. Execute places operation
      const result = await this.executePlacesOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent('places_operation', {
        venueId: request.venueId,
        userId: request.userId,
        action: request.action,
        regionCode: request.regionCode,
        allowed: true,
        complianceFlags: [
          ...venueCheck.flags,
          ...locationCheck.flags,
          ...capacityCheck.flags,
        ].length,
        processingTime: Date.now() - startTime,
      });

      return {
        venueId: request.venueId,
        allowed: true,
        venueData: result.venueData,
        complianceFlags: [
          ...venueCheck.flags,
          ...locationCheck.flags,
          ...capacityCheck.flags,
        ],
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error(`Places processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent('places_error', {
        venueId: request.venueId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      return {
        venueId: request.venueId,
        allowed: false,
        blockedReason: 'System error during processing',
        complianceFlags: ['error'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate venue operating status
   */
  private async validateVenueStatus(request: PlacesRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check if venue exists and is active
    const venueStatus = await this.getVenueStatus(request.venueId);
    if (!venueStatus.exists) {
      return {
        allowed: false,
        blockedReason: 'Venue not found',
        flags: ['venue_not_found'],
      };
    }

    if (!venueStatus.active) {
      return {
        allowed: false,
        blockedReason: 'Venue is currently inactive',
        flags: ['venue_inactive'],
      };
    }

    // Check operating hours
    if (!this.isWithinOperatingHours(request, venueStatus)) {
      return {
        allowed: false,
        blockedReason: 'Venue is outside operating hours',
        flags: ['outside_hours'],
      };
    }

    flags.push('venue_active', 'within_hours');

    // Check regional compliance
    if (!this.isRegionallyCompliant(request.venueId, request.regionCode)) {
      return {
        allowed: false,
        blockedReason: 'Venue not authorized for this region',
        flags: ['regional_violation'],
      };
    }

    flags.push('regional_compliant');
    return { allowed: true, flags };
  }

  /**
   * Validate user location and geofencing
   */
  private async validateLocationCompliance(request: PlacesRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (!request.location) {
      // Location not required for all actions
      if (['info', 'review'].includes(request.action)) {
        flags.push('location_not_required');
        return { allowed: true, flags };
      }
      return {
        allowed: false,
        blockedReason: 'Location required for this action',
        flags: ['location_required'],
      };
    }

    // Check if user is within venue geofence
    const geofenceCheck = await this.checkGeofenceCompliance(
      request.venueId,
      request.location,
      request.action
    );

    if (!geofenceCheck.allowed) {
      return {
        allowed: false,
        blockedReason: geofenceCheck.blockedReason,
        flags: geofenceCheck.flags,
      };
    }

    flags.push(...geofenceCheck.flags);
    return { allowed: true, flags };
  }

  /**
   * Validate capacity and booking rules
   */
  private async validateCapacityRules(request: PlacesRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    if (request.action === 'book') {
      // Check booking availability
      const availability = await this.checkBookingAvailability(request);
      if (!availability.allowed) {
        return {
          allowed: false,
          blockedReason: availability.blockedReason,
          flags: availability.flags,
        };
      }
      flags.push(...availability.flags);
    }

    if (request.action === 'check_in') {
      // Check current capacity
      const capacity = await this.checkCurrentCapacity(request.venueId);
      if (!capacity.allowed) {
        return {
          allowed: false,
          blockedReason: capacity.blockedReason,
          flags: capacity.flags,
        };
      }
      flags.push(...capacity.flags);
    }

    return { allowed: true, flags };
  }

  /**
   * Execute places operation
   */
  private async executePlacesOperation(request: PlacesRequest): Promise<any> {
    const result = await this.kafkaClient.send('places.execute', {
      venueId: request.venueId,
      userId: request.userId,
      action: request.action,
      regionCode: request.regionCode,
      location: request.location,
      context: request.context,
      edgeValidated: true,
      timestamp: new Date().toISOString(),
    }).toPromise();

    return result;
  }

  /**
   * Get venue status (simplified)
   */
  private async getVenueStatus(venueId: string): Promise<{
    exists: boolean;
    active: boolean;
    operatingHours?: any;
  }> {
    // Would query venue database/cache
    return {
      exists: true,
      active: true,
      operatingHours: {
        monday: { open: '09:00', close: '23:00' },
        // ... other days
      },
    };
  }

  /**
   * Check if within operating hours
   */
  private isWithinOperatingHours(request: PlacesRequest, venueStatus: any): boolean {
    if (!venueStatus.operatingHours) return true;

    const now = new Date();
    const dayOfWeek = now.toLocaleLowerCase('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const hours = venueStatus.operatingHours[dayOfWeek];
    if (!hours) return false;

    return currentTime >= hours.open && currentTime <= hours.close;
  }

  /**
   * Check regional compliance
   */
  private isRegionallyCompliant(venueId: string, regionCode: string): boolean {
    // Would check venue authorization for region
    return true; // Simplified
  }

  /**
   * Check geofence compliance
   */
  private async checkGeofenceCompliance(
    venueId: string,
    location: { latitude: number; longitude: number },
    action: string
  ): Promise<{ allowed: boolean; blockedReason?: string; flags: string[] }> {
    // Would check if user location is within venue geofence
    // For check-ins, user must be at venue
    // For bookings, more lenient geofence allowed

    const flags = ['location_verified'];

    if (action === 'check_in') {
      flags.push('geofence_strict');
      // Strict geofence check would go here
    } else {
      flags.push('geofence_lenient');
    }

    return { allowed: true, flags };
  }

  /**
   * Check booking availability
   */
  private async checkBookingAvailability(request: PlacesRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    // Would check venue booking system
    return {
      allowed: true,
      flags: ['booking_available'],
    };
  }

  /**
   * Check current capacity
   */
  private async checkCurrentCapacity(venueId: string): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    // Would check current occupancy vs capacity
    return {
      allowed: true,
      flags: ['capacity_ok'],
    };
  }
}
