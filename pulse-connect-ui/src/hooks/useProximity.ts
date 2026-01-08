import { useState, useCallback } from 'react';
import { Venue, ProximityInsights } from '../../../pulse-connect-core/src/places/proximityIntegration';

interface UseProximityReturn {
  searchVenues: (location: { lat: number; lng: number }, options: {
    radius?: number;
    category?: string;
    limit?: number;
  }) => Promise<{ venues: Venue[]; insights: ProximityInsights }>;
  getDirections: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, options?: any) => Promise<google.maps.DirectionsResult>;
  getProximityInsights: (venues: Venue[]) => ProximityInsights;
  isLoading: boolean;
  error: string | null;
}

export const useProximity = (): UseProximityReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchVenues = useCallback(async (
    location: { lat: number; lng: number },
    options: { radius?: number; category?: string; limit?: number } = {}
  ): Promise<{ venues: Venue[]; insights: ProximityInsights }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/proximity/search-venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search venues';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDirections = useCallback(async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    options: any = {}
  ): Promise<google.maps.DirectionsResult> => {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps?.DirectionsService) {
        reject(new Error('Google Maps DirectionsService not available'));
        return;
      }

      const directionsService = new google.maps.DirectionsService();

      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
        ...options
      };

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }, []);

  const getProximityInsights = useCallback((venues: Venue[]): ProximityInsights => {
    if (venues.length === 0) {
      return {
        averageDistance: 0,
        categoryDistribution: {},
        regionalDistribution: {},
        proximityScoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 }
      };
    }

    // Calculate average distance
    const totalDistance = venues.reduce((sum, venue) => sum + (venue.distanceKm || 0), 0);
    const averageDistance = totalDistance / venues.length;

    // Category distribution
    const categoryDistribution = venues.reduce((acc, venue) => {
      acc[venue.category] = (acc[venue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Regional distribution
    const regionalDistribution = venues.reduce((acc, venue) => {
      const region = venue.regionInfo?.countryCode || 'unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Proximity score distribution
    const proximityScoreDistribution = venues.reduce((acc, venue) => {
      const score = venue.proximityScore;
      if (score >= 80) acc.excellent++;
      else if (score >= 60) acc.good++;
      else if (score >= 40) acc.fair++;
      else acc.poor++;
      return acc;
    }, { excellent: 0, good: 0, fair: 0, poor: 0 });

    return {
      averageDistance,
      categoryDistribution,
      regionalDistribution,
      proximityScoreDistribution
    };
  }, []);

  return {
    searchVenues,
    getDirections,
    getProximityInsights,
    isLoading,
    error
  };
};
