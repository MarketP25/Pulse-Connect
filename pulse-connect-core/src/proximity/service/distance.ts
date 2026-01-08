export class DistanceEngine {
  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistanceKm(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers

    const lat1Rad = this.toRadians(point1.lat);
    const lat2Rad = this.toRadians(point2.lat);
    const deltaLatRad = this.toRadians(point2.lat - point1.lat);
    const deltaLngRad = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate distance in miles
   */
  calculateDistanceMiles(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    return this.calculateDistanceKm(point1, point2) * 0.621371;
  }

  /**
   * Check if two points are within a certain radius
   */
  isWithinRadius(center: { lat: number; lng: number }, point: { lat: number; lng: number }, radiusKm: number): boolean {
    return this.calculateDistanceKm(center, point) <= radiusKm;
  }

  /**
   * Find points within radius of a center point
   */
  findPointsWithinRadius(center: { lat: number; lng: number }, points: Array<{ lat: number; lng: number; id?: string }>, radiusKm: number): Array<{ lat: number; lng: number; id?: string; distance: number }> {
    return points
      .map(point => ({
        ...point,
        distance: this.calculateDistanceKm(center, point)
      }))
      .filter(point => point.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
