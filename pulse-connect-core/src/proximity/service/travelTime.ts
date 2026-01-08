import { Location, TravelTimeResult } from './proximityEngine';

export interface TravelTimeProvider {
  estimate(origin: Location, destination: Location, mode: 'driving' | 'walking' | 'transit'): Promise<TravelTimeResult>;
}

export class HaversineTravelTimeProvider implements TravelTimeProvider {
  async estimate(origin: Location, destination: Location, mode: 'driving' | 'walking' | 'transit' = 'driving'): Promise<TravelTimeResult> {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.lat - origin.lat);
    const dLng = this.toRadians(destination.lng - origin.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origin.lat)) * Math.cos(this.toRadians(destination.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Speed estimates based on mode
    let speedKmh: number;
    switch (mode) {
      case 'walking':
        speedKmh = 5;
        break;
      case 'transit':
        speedKmh = 25;
        break;
      case 'driving':
      default:
        speedKmh = 50;
        break;
    }

    const durationMinutes = (distanceKm / speedKmh) * 60;

    return {
      durationMinutes: Math.round(durationMinutes),
      distanceKm: Math.round(distanceKm * 100) / 100,
      mode
    };
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export class MatrixTravelTimeProvider implements TravelTimeProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async estimate(origin: Location, destination: Location, mode: 'driving' | 'walking' | 'transit' = 'driving'): Promise<TravelTimeResult> {
    // This would integrate with a matrix API like Google Distance Matrix
    // For now, fall back to Haversine estimation
    const fallback = new HaversineTravelTimeProvider();
    return fallback.estimate(origin, destination, mode);
  }
}
