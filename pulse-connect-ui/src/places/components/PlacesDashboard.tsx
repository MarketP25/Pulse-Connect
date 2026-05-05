import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Clock, Users, Search, Filter } from 'lucide-react';
import { Place } from "../../../../pulse-connect-core/src/places/types/places";

interface PlacesDashboardProps {
  userId: string;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const PlacesDashboard: React.FC<PlacesDashboardProps> = ({
  userId,
  userLocation,
}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    openNow: false,
    rating: 0,
    priceRange: '',
    distance: 5000, // 5km default
  });

  useEffect(() => {
    loadPlaces();
  }, [searchQuery, selectedCategory, filters]);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      // This would call the places API through the edge gateway
      const searchParams = {
        query: searchQuery,
        category: selectedCategory ? [selectedCategory] : undefined,
        location: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: filters.distance,
        } : undefined,
        openNow: filters.openNow,
        rating: filters.rating > 0 ? filters.rating : undefined,
        priceRange: filters.priceRange ? [filters.priceRange] : undefined,
        limit: 20,
      };

      // Mock data for now
      const mockPlaces: Place[] = [
        {
          id: '1',
          name: 'The Grand Cafe',
          description: 'A premium dining experience with international cuisine',
          category: 'restaurant',
          type: 'physical',
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            geohash: 'dr5rus',
            timezone: 'America/New_York',
            country: 'US',
            region: 'NY',
            city: 'New York',
            postalCode: '10001',
          },
          address: {
            street: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            formatted: '123 Main St, New York, NY 10001, US',
            components: [],
          },
          contact: {
            phone: '+1-555-0123',
            email: 'info@grandcafe.com',
            website: 'https://grandcafe.com',
            socialMedia: [],
          },
          businessHours: [
            {
              day: 'monday',
              open: '08:00',
              close: '22:00',
              isOpen: true,
            },
            // ... other days
          ],
          amenities: [
            {
              id: 'wifi',
              name: 'Free WiFi',
              category: 'technology',
              available: true,
            },
            {
              id: 'parking',
              name: 'Parking Available',
              category: 'parking',
              available: true,
            },
          ],
          pricing: {
            currency: 'USD',
            priceRange: '$$$',
            averagePrice: 45,
            pricingModel: 'fixed',
          },
          images: [],
          rating: {
            overall: 4.2,
            count: 128,
            distribution: { 1: 2, 2: 3, 3: 15, 4: 45, 5: 63 },
            aspects: [],
          },
          reviews: [],
          capacity: {
            maxOccupancy: 100,
            reservations: [],
            waitlist: [],
          },
          accessibility: {
            wheelchairAccessible: true,
            wheelchairAccessibleRestroom: true,
            hearingAccessible: true,
            visualAccessible: false,
            serviceAnimals: true,
            parking: {
              accessibleSpaces: 5,
              totalSpaces: 20,
              vanAccessible: true,
              valetService: true,
            },
            entrance: {
              level: true,
              ramp: true,
              steps: 0,
              automaticDoor: true,
              callButton: false,
            },
            seating: {
              accessibleTables: 8,
              totalTables: 50,
              heightAdjustable: true,
              spaceForWheelchair: true,
            },
          },
          policies: [
            {
              type: 'cancellation',
              title: 'Cancellation Policy',
              description: 'Free cancellation up to 24 hours before reservation',
              required: true,
            },
          ],
          metadata: {
            tags: ['fine-dining', 'international', 'romantic'],
            keywords: ['restaurant', 'cafe', 'dining'],
            categories: ['restaurant'],
            features: ['outdoor-seating', 'live-music'],
            certifications: [],
            awards: [],
            partnerships: [],
            customFields: {},
          },
          status: 'active',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2024-01-01'),
          verified: true,
          featured: false,
        },
        // Add more mock places...
      ];

      setPlaces(mockPlaces);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const handleReservation = async (placeId: string) => {
    // This would open a reservation modal/form
    console.log('Create reservation for place:', placeId);
  };

  const categories = [
    'restaurant',
    'bar',
    'cafe',
    'hotel',
    'attraction',
    'shopping',
    'entertainment',
    'hospital',
    'school',
    'garage',
    'petrol-station',
    'others'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Places</h1>
          <p className="text-muted-foreground">
            Discover and book amazing places near you
          </p>
        </div>
        <Button>
          <MapPin className="w-4 h-4 mr-2" />
          View Map
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search places, restaurants, attractions..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <Button
                variant={filters.openNow ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
              >
                <Clock className="w-4 h-4 mr-2" />
                Open Now
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className="cursor-pointer capitalize"
                onClick={() => handleCategoryFilter(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Places Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {places.map((place) => (
          <Card key={place.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Image Placeholder */}
            <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>

            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{place.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {place.description}
                  </p>
                </div>
                {place.verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Rating and Reviews */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 font-medium">{place.rating.overall}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({place.rating.count} reviews)
                </span>
                <Badge variant="outline" className="text-xs">
                  {place.pricing.priceRange}
                </Badge>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {place.address.formatted}
                </span>
              </div>

              {/* Hours and Capacity */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Open until 10 PM</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{place.capacity.maxOccupancy} capacity</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-1">
                {place.amenities.slice(0, 3).map((amenity) => (
                  <Badge key={amenity.id} variant="secondary" className="text-xs">
                    {amenity.name}
                  </Badge>
                ))}
                {place.amenities.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{place.amenities.length - 3} more
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleReservation(place.id)}
                >
                  Reserve
                </Button>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading places...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && places.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No places found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button onClick={() => setSearchQuery('')}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};
