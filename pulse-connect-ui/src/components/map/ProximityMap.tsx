'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer, InfoWindow, OverlayView } from '@react-google-maps/api';
import { useProximity } from '../../hooks/useProximity';
import { Venue, ProximityInsights } from '../../../pulse-connect-core/src/places/proximityIntegration';

interface ProximityMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  venues?: Venue[];
  userLocation?: { lat: number; lng: number };
  showDirections?: boolean;
  destination?: { lat: number; lng: number };
  mapStyle?: 'standard' | 'satellite' | 'terrain' | 'hybrid';
  enableDragging?: boolean;
  enableZoom?: boolean;
  showControls?: boolean;
  onVenueClick?: (venue: Venue) => void;
  onMapClick?: (location: { lat: number; lng: number }) => void;
  onDirectionsChange?: (directions: google.maps.DirectionsResult) => void;
}

const ProximityMap: React.FC<ProximityMapProps> = ({
  center = { lat: 0, lng: 0 },
  zoom = 12,
  venues = [],
  userLocation,
  showDirections = false,
  destination,
  mapStyle = 'standard',
  enableDragging = true,
  enableZoom = true,
  showControls = true,
  onVenueClick,
  onMapClick,
  onDirectionsChange
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapType, setMapType] = useState<google.maps.MapTypeId>(google.maps.MapTypeId.ROADMAP);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer | null>(null);
  const [transitLayer, setTransitLayer] = useState<google.maps.TransitLayer | null>(null);
  const [bicyclingLayer, setBicyclingLayer] = useState<google.maps.BicyclingLayer | null>(null);

  const { searchVenues, getDirections, getProximityInsights } = useProximity();

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry', 'drawing']
  });

  // Map container style
  const containerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  // Map options
  const mapOptions: google.maps.MapOptions = {
    zoomControl: showControls && enableZoom,
    mapTypeControl: showControls,
    scaleControl: showControls,
    streetViewControl: showControls,
    rotateControl: showControls,
    fullscreenControl: showControls,
    gestureHandling: enableDragging ? 'cooperative' : 'none',
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_LEFT
    },
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    }
  };

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Initialize layers
    const traffic = new google.maps.TrafficLayer();
    const transit = new google.maps.TransitLayer();
    const bicycling = new google.maps.BicyclingLayer();

    setTrafficLayer(traffic);
    setTransitLayer(transit);
    setBicyclingLayer(bicycling);

    // Add custom controls
    addCustomControls(map);
  }, []);

  // Add custom controls to map
  const addCustomControls = (map: google.maps.Map) => {
    // Satellite/Aerial view toggle
    const satelliteControl = document.createElement('div');
    satelliteControl.style.backgroundColor = '#fff';
    satelliteControl.style.border = '2px solid #fff';
    satelliteControl.style.borderRadius = '3px';
    satelliteControl.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    satelliteControl.style.cursor = 'pointer';
    satelliteControl.style.marginBottom = '22px';
    satelliteControl.style.textAlign = 'center';
    satelliteControl.title = 'Toggle Satellite View';
    satelliteControl.innerHTML = '🛰️';

    satelliteControl.addEventListener('click', () => {
      const newMapType = isSatelliteView ? google.maps.MapTypeId.ROADMAP : google.maps.MapTypeId.SATELLITE;
      setMapType(newMapType);
      setIsSatelliteView(!isSatelliteView);
      map.setMapTypeId(newMapType);
    });

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(satelliteControl);

    // Traffic layer toggle
    const trafficControl = document.createElement('div');
    trafficControl.style.backgroundColor = '#fff';
    trafficControl.style.border = '2px solid #fff';
    trafficControl.style.borderRadius = '3px';
    trafficControl.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    trafficControl.style.cursor = 'pointer';
    trafficControl.style.marginBottom = '22px';
    trafficControl.style.textAlign = 'center';
    trafficControl.title = 'Toggle Traffic Layer';
    trafficControl.innerHTML = '🚗';

    trafficControl.addEventListener('click', () => {
      if (trafficLayer) {
        if (trafficLayer.getMap()) {
          trafficLayer.setMap(null);
          trafficControl.style.backgroundColor = '#fff';
        } else {
          trafficLayer.setMap(map);
          trafficControl.style.backgroundColor = '#e3f2fd';
        }
      }
    });

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(trafficControl);

    // Transit layer toggle
    const transitControl = document.createElement('div');
    transitControl.style.backgroundColor = '#fff';
    transitControl.style.border = '2px solid #fff';
    transitControl.style.borderRadius = '3px';
    transitControl.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    transitControl.style.cursor = 'pointer';
    transitControl.style.marginBottom = '22px';
    transitControl.style.textAlign = 'center';
    transitControl.title = 'Toggle Transit Layer';
    transitControl.innerHTML = '🚇';

    transitControl.addEventListener('click', () => {
      if (transitLayer) {
        if (transitLayer.getMap()) {
          transitLayer.setMap(null);
          transitControl.style.backgroundColor = '#fff';
        } else {
          transitLayer.setMap(map);
          transitControl.style.backgroundColor = '#e3f2fd';
        }
      }
    });

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(transitControl);

    // Bicycling layer toggle
    const bicyclingControl = document.createElement('div');
    bicyclingControl.style.backgroundColor = '#fff';
    bicyclingControl.style.border = '2px solid #fff';
    bicyclingControl.style.borderRadius = '3px';
    bicyclingControl.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    bicyclingControl.style.cursor = 'pointer';
    bicyclingControl.style.marginBottom = '22px';
    bicyclingControl.style.textAlign = 'center';
    bicyclingControl.title = 'Toggle Bicycling Layer';
    bicyclingControl.innerHTML = '🚴';

    bicyclingControl.addEventListener('click', () => {
      if (bicyclingLayer) {
        if (bicyclingLayer.getMap()) {
          bicyclingLayer.setMap(null);
          bicyclingControl.style.backgroundColor = '#fff';
        } else {
          bicyclingLayer.setMap(map);
          bicyclingControl.style.backgroundColor = '#e3f2fd';
        }
      }
    });

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(bicyclingControl);
  };

  // Handle map click
  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && onMapClick) {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      onMapClick(location);
    }
  }, [onMapClick]);

  // Handle venue marker click
  const onVenueMarkerClick = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
    if (onVenueClick) {
      onVenueClick(venue);
    }
  }, [onVenueClick]);

  // Get directions
  useEffect(() => {
    if (showDirections && userLocation && destination) {
      const fetchDirections = async () => {
        try {
          const result = await getDirections(userLocation, destination, {
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
          });
          setDirections(result);
          if (onDirectionsChange) {
            onDirectionsChange(result);
          }
        } catch (error) {
          console.error('Error fetching directions:', error);
        }
      };

      fetchDirections();
    }
  }, [showDirections, userLocation, destination, getDirections, onDirectionsChange]);

  // Get venue icon based on category and proximity score
  const getVenueIcon = (venue: Venue): string => {
    const baseIcon = '📍';
    const categoryIcons: Record<string, string> = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      hotel: '🏨',
      shop: '🛍️',
      park: '🌳',
      museum: '🏛️',
      gym: '💪',
      hospital: '🏥',
      school: '🎓',
      bank: '🏦',
      gas_station: '⛽',
      pharmacy: '💊',
      supermarket: '🛒'
    };

    return categoryIcons[venue.category] || baseIcon;
  };

  // Get marker color based on proximity score
  const getMarkerColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // Custom marker component
  const CustomMarker: React.FC<{ venue: Venue; onClick: () => void }> = ({ venue, onClick }) => {
    const icon = getVenueIcon(venue);
    const color = getMarkerColor(venue.proximityScore);

    return (
      <OverlayView
        position={venue.location}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div
          onClick={onClick}
          style={{
            backgroundColor: color,
            border: '2px solid white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transform: 'translate(-50%, -50%)'
          }}
          title={`${venue.name} (${venue.proximityScore.toFixed(1)}/100)`}
        >
          {icon}
        </div>
      </OverlayView>
    );
  };

  // Loading state
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Map Loading Error</h3>
          <p className="text-red-600">Failed to load Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Map</h3>
          <p className="text-gray-600">Initializing proximity-powered map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={onMapClick}
        mapTypeId={mapType}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="3"/>
                  <circle cx="20" cy="20" r="8" fill="white"/>
                  <circle cx="20" cy="20" r="4" fill="#3b82f6"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            }}
            title="Your Location"
          />
        )}

        {/* Venue markers */}
        {venues.map((venue) => (
          <CustomMarker
            key={venue.id}
            venue={venue}
            onClick={() => onVenueMarkerClick(venue)}
          />
        ))}

        {/* Directions */}
        {directions && showDirections && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#3b82f6',
                strokeWeight: 5,
                strokeOpacity: 0.8
              }
            }}
          />
        )}

        {/* Info window for selected venue */}
        {selectedVenue && (
          <InfoWindow
            position={selectedVenue.location}
            onCloseClick={() => setSelectedVenue(null)}
          >
            <div className="p-3 max-w-xs">
              <h3 className="font-semibold text-lg mb-2">{selectedVenue.name}</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Category:</strong> {selectedVenue.category}</p>
                <p><strong>Distance:</strong> {selectedVenue.distanceKm?.toFixed(1)} km</p>
                <p><strong>Proximity Score:</strong> {selectedVenue.proximityScore.toFixed(1)}/100</p>
                {selectedVenue.regionInfo && (
                  <p><strong>Region:</strong> {selectedVenue.regionInfo.locality}, {selectedVenue.regionInfo.countryCode}</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  onClick={() => {
                    if (userLocation) {
                      // Trigger directions to this venue
                      setDirections(null); // Reset to trigger new directions
                    }
                  }}
                >
                  Get Directions
                </button>
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  onClick={() => {
                    // Add to favorites or similar action
                    console.log('Added to favorites:', selectedVenue.name);
                  }}
                >
                  ⭐ Favorite
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-2">Map Tools</div>

        {/* Zoom controls */}
        <div className="flex gap-1">
          <button
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
            onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 12) + 1)}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
            onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 12) - 1)}
            title="Zoom Out"
          >
            −
          </button>
        </div>

        {/* Layer toggles */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                if (trafficLayer) {
                  if (e.target.checked) {
                    trafficLayer.setMap(mapRef.current);
                  } else {
                    trafficLayer.setMap(null);
                  }
                }
              }}
            />
            Traffic
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                if (transitLayer) {
                  if (e.target.checked) {
                    transitLayer.setMap(mapRef.current);
                  } else {
                    transitLayer.setMap(null);
                  }
                }
              }}
            />
            Transit
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                if (bicyclingLayer) {
                  if (e.target.checked) {
                    bicyclingLayer.setMap(mapRef.current);
                  } else {
                    bicyclingLayer.setMap(null);
                  }
                }
              }}
            />
            Bicycling
          </label>
        </div>

        {/* Map style selector */}
        <select
          className="w-full text-sm border rounded p-1"
          value={mapType}
          onChange={(e) => {
            const newType = e.target.value as google.maps.MapTypeId;
            setMapType(newType);
            mapRef.current?.setMapTypeId(newType);
          }}
        >
          <option value={google.maps.MapTypeId.ROADMAP}>Standard</option>
          <option value={google.maps.MapTypeId.SATELLITE}>Satellite</option>
          <option value={google.maps.MapTypeId.HYBRID}>Hybrid</option>
          <option value={google.maps.MapTypeId.TERRAIN}>Terrain</option>
        </select>
      </div>

      {/* Proximity insights overlay */}
      {venues.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <div className="text-sm font-semibold text-gray-700 mb-2">Proximity Insights</div>
          <div className="space-y-1 text-xs">
            <p><strong>Venues:</strong> {venues.length}</p>
            <p><strong>Avg Distance:</strong> {(venues.reduce((sum, v) => sum + (v.distanceKm || 0), 0) / venues.length).toFixed(1)} km</p>
            <p><strong>Top Category:</strong> {venues.reduce((acc, v) => {
              acc[v.category] = (acc[v.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) &&
              Object.entries(venues.reduce((acc, v) => {
                acc[v.category] = (acc[v.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).sort(([,a], [,b]) => b - a)[0]?.[0]
            }</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProximityMap;
