'use client';

import React, { useState, useEffect } from 'react';
import ProximityMap from '../../components/map/ProximityMap';
import { Venue } from '../../../pulse-connect-core/src/places/proximityIntegration';

const MapDemoPage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | undefined>();

  // Mock venues data
  useEffect(() => {
    const mockVenues: Venue[] = [
      {
        id: '1',
        name: 'Central Park Cafe',
        location: { lat: 40.7829, lng: -73.9654 },
        category: 'cafe',
        distanceKm: 0.5,
        proximityScore: 95,
        regionInfo: {
          countryCode: 'US',
          region: 'New York',
          locality: 'Manhattan',
          timezone: 'America/New_York',
          currency: 'USD',
          locale: 'en-US',
          language: 'en'
        }
      },
      {
        id: '2',
        name: 'Times Square Restaurant',
        location: { lat: 40.7580, lng: -73.9855 },
        category: 'restaurant',
        distanceKm: 1.2,
        proximityScore: 88,
        regionInfo: {
          countryCode: 'US',
          region: 'New York',
          locality: 'Manhattan',
          timezone: 'America/New_York',
          currency: 'USD',
          locale: 'en-US',
          language: 'en'
        }
      },
      {
        id: '3',
        name: 'Brooklyn Bridge Park',
        location: { lat: 40.7021, lng: -73.9967 },
        category: 'park',
        distanceKm: 2.1,
        proximityScore: 76,
        regionInfo: {
          countryCode: 'US',
          region: 'New York',
          locality: 'Brooklyn',
          timezone: 'America/New_York',
          currency: 'USD',
          locale: 'en-US',
          language: 'en'
        }
      },
      {
        id: '4',
        name: 'Empire State Building',
        location: { lat: 40.7484, lng: -73.9857 },
        category: 'museum',
        distanceKm: 0.8,
        proximityScore: 92,
        regionInfo: {
          countryCode: 'US',
          region: 'New York',
          locality: 'Manhattan',
          timezone: 'America/New_York',
          currency: 'USD',
          locale: 'en-US',
          language: 'en'
        }
      }
    ];

    setVenues(mockVenues);

    // Set user location to a point near the venues
    setUserLocation({ lat: 40.7505, lng: -73.9934 });
  }, []);

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
    console.log('Venue clicked:', venue);
  };

  const handleMapClick = (location: { lat: number; lng: number }) => {
    console.log('Map clicked at:', location);
  };

  const handleGetDirections = () => {
    if (selectedVenue) {
      setDestination(selectedVenue.location);
      setShowDirections(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Proximity Map Demo</h1>
              <p className="text-gray-600 mt-1">
                Interactive map with proximity-powered features
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                🗺️ Powered by Proximity Intelligence
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Interactive Proximity Map
                </h2>
                <p className="text-gray-600 text-sm">
                  Click on venue markers to see details. Use map controls to toggle layers and views.
                </p>
              </div>

              <ProximityMap
                center={userLocation || { lat: 40.7505, lng: -73.9934 }}
                zoom={14}
                venues={venues}
                userLocation={userLocation}
                showDirections={showDirections}
                destination={destination}
                enableDragging={true}
                enableZoom={true}
                showControls={true}
                onVenueClick={handleVenueClick}
                onMapClick={handleMapClick}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Venue Details */}
            {selectedVenue && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Venue Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedVenue.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{selectedVenue.category}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Distance:</span>
                      <div className="font-medium">{selectedVenue.distanceKm?.toFixed(1)} km</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Score:</span>
                      <div className="font-medium">{selectedVenue.proximityScore}/100</div>
                    </div>
                  </div>

                  {selectedVenue.regionInfo && (
                    <div>
                      <span className="text-gray-500 text-sm">Location:</span>
                      <div className="font-medium text-sm">
                        {selectedVenue.regionInfo.locality}, {selectedVenue.regionInfo.region}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleGetDirections}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      🧭 Get Directions
                    </button>
                    <button
                      onClick={() => console.log('Add to favorites')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      ⭐ Favorite
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Map Features */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Map Features
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Your Location</span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Venue Markers:</div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm">High Proximity (80-100)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Medium Proximity (60-79)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Low Proximity (40-59)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Poor Proximity (<40)</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-2">Controls:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 🛰️ Toggle satellite view</li>
                    <li>• 🚗 Toggle traffic layer</li>
                    <li>• 🚇 Toggle transit layer</li>
                    <li>• 🚴 Toggle bicycling layer</li>
                    <li>• ± Zoom controls</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Proximity Insights */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Proximity Insights
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Venues:</span>
                  <span className="font-medium">{venues.length}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Distance:</span>
                  <span className="font-medium">
                    {(venues.reduce((sum, v) => sum + (v.distanceKm || 0), 0) / venues.length).toFixed(1)} km
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Top Category:</span>
                  <span className="font-medium capitalize">
                    {Object.entries(
                      venues.reduce((acc, v) => {
                        acc[v.category] = (acc[v.category] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None'}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">
                    🧠 Powered by planetary proximity intelligence
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDemoPage;
