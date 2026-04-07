export interface Place {
  id: string;
  name: string;
  description: string;
  category: PlaceCategory;
  type: PlaceType;
  location: Location;
  address: Address;
  contact: ContactInfo;
  businessHours: BusinessHours[];
  amenities: Amenity[];
  pricing: PricingInfo;
  images: Image[];
  rating: Rating;
  reviews: Review[];
  capacity: Capacity;
  accessibility: Accessibility;
  policies: Policy[];
  metadata: PlaceMetadata;
  status: PlaceStatus;
  createdAt: Date;
  updatedAt: Date;
  verified: boolean;
  featured: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  geohash: string;
  timezone: string;
  country: string;
  region: string;
  city: string;
  postalCode: string;
  neighborhood?: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  formatted: string;
  components: AddressComponent[];
}

export interface AddressComponent {
  type: AddressComponentType;
  value: string;
  shortValue?: string;
}

export type AddressComponentType =
  | "street_number"
  | "street_name"
  | "locality"
  | "sublocality"
  | "administrative_area_level_1"
  | "administrative_area_level_2"
  | "country"
  | "postal_code";

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  socialMedia: SocialMedia[];
}

export interface SocialMedia {
  platform: string;
  handle: string;
  url: string;
}

export interface BusinessHours {
  day: DayOfWeek;
  open: string; // HH:MM format
  close: string; // HH:MM format
  isOpen: boolean;
  specialHours?: SpecialHours;
}

export interface SpecialHours {
  date: string; // YYYY-MM-DD
  open?: string;
  close?: string;
  isClosed: boolean;
  reason?: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  icon?: string;
  available: boolean;
  description?: string;
}

export type AmenityCategory =
  | "accessibility"
  | "dining"
  | "entertainment"
  | "facilities"
  | "parking"
  | "services"
  | "technology"
  | "other";

export interface PricingInfo {
  currency: string;
  priceRange: PriceRange;
  averagePrice?: number;
  pricingModel: PricingModel;
  dynamicPricing?: DynamicPricing;
}

export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export type PricingModel =
  | "free"
  | "fixed"
  | "per_person"
  | "per_hour"
  | "subscription"
  | "dynamic";

export interface DynamicPricing {
  enabled: boolean;
  factors: PricingFactor[];
  minPrice: number;
  maxPrice: number;
}

export interface PricingFactor {
  type: PricingFactorType;
  weight: number;
  multiplier: number;
}

export type PricingFactorType = "demand" | "time" | "season" | "events" | "weather" | "competition";

export interface Image {
  id: string;
  url: string;
  thumbnail: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  size: number;
  format: string;
  uploadedAt: Date;
  tags: string[];
}

export interface Rating {
  overall: number;
  count: number;
  distribution: RatingDistribution;
  aspects: AspectRating[];
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface AspectRating {
  aspect: string;
  rating: number;
  count: number;
}

export interface Review {
  id: string;
  userId: string;
  placeId: string;
  rating: number;
  title?: string;
  content: string;
  images?: Image[];
  aspects: AspectRating[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Capacity {
  maxOccupancy: number;
  currentOccupancy?: number;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
}

export interface Reservation {
  id: string;
  userId: string;
  partySize: number;
  dateTime: Date;
  duration: number; // minutes
  status: ReservationStatus;
  specialRequests?: string;
  createdAt: Date;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export interface WaitlistEntry {
  id: string;
  userId: string;
  partySize: number;
  estimatedWaitTime: number;
  position: number;
  notified: boolean;
  createdAt: Date;
}

export interface Accessibility {
  wheelchairAccessible: boolean;
  wheelchairAccessibleRestroom: boolean;
  hearingAccessible: boolean;
  visualAccessible: boolean;
  serviceAnimals: boolean;
  parking: ParkingAccessibility;
  entrance: EntranceAccessibility;
  seating: SeatingAccessibility;
}

export interface ParkingAccessibility {
  accessibleSpaces: number;
  totalSpaces: number;
  vanAccessible: boolean;
  valetService: boolean;
}

export interface EntranceAccessibility {
  level: boolean;
  ramp: boolean;
  steps: number;
  automaticDoor: boolean;
  callButton: boolean;
}

export interface SeatingAccessibility {
  accessibleTables: number;
  totalTables: number;
  heightAdjustable: boolean;
  spaceForWheelchair: boolean;
}

export interface Policy {
  type: PolicyType;
  title: string;
  description: string;
  required: boolean;
}

export type PolicyType =
  | "cancellation"
  | "refund"
  | "age_restriction"
  | "dress_code"
  | "pet_policy"
  | "smoking"
  | "noise"
  | "payment"
  | "reservation"
  | "other";

export interface PlaceMetadata {
  tags: string[];
  keywords: string[];
  categories: string[];
  features: string[];
  certifications: Certification[];
  awards: Award[];
  partnerships: Partnership[];
  customFields: Record<string, any>;
}

export interface Certification {
  name: string;
  issuer: string;
  date: Date;
  expires?: Date;
  verified: boolean;
}

export interface Award {
  name: string;
  issuer: string;
  year: number;
  category?: string;
}

export interface Partnership {
  partnerId: string;
  partnerName: string;
  type: string;
  startDate: Date;
  endDate?: Date;
}

export type PlaceStatus = "active" | "inactive" | "pending_review" | "suspended" | "closed";

export type PlaceCategory =
  | "restaurant"
  | "bar"
  | "cafe"
  | "hotel"
  | "attraction"
  | "shopping"
  | "entertainment"
  | "sports"
  | "health"
  | "education"
  | "office"
  | "residential"
  | "other";

export type PlaceType = "physical" | "virtual" | "hybrid";

// Search and filter interfaces
export interface PlaceSearchQuery {
  query?: string;
  location?: LocationQuery;
  category?: PlaceCategory[];
  type?: PlaceType[];
  amenities?: string[];
  priceRange?: PriceRange[];
  rating?: number;
  openNow?: boolean;
  distance?: number;
  sortBy?: PlaceSortOption;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface LocationQuery {
  latitude: number;
  longitude: number;
  radius?: number; // in meters
  address?: string;
}

export type PlaceSortOption =
  | "relevance"
  | "distance"
  | "rating"
  | "price"
  | "popularity"
  | "newest";

export interface PlaceSearchResult {
  places: Place[];
  total: number;
  facets: SearchFacet[];
  suggestions: string[];
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

// Analytics and insights
export interface PlaceAnalytics {
  placeId: string;
  period: AnalyticsPeriod;
  metrics: PlaceMetrics;
  trends: TrendData[];
  insights: Insight[];
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  granularity: "hour" | "day" | "week" | "month";
}

export interface PlaceMetrics {
  views: number;
  searches: number;
  clicks: number;
  bookings: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  occupancyRate: number;
  customerSatisfaction: number;
}

export interface TrendData {
  date: string;
  metric: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation?: string;
}

export type InsightType =
  | "peak_hours"
  | "popular_days"
  | "demand_trends"
  | "competition"
  | "customer_feedback"
  | "revenue_opportunities";

// Management interfaces
export interface PlaceManager {
  id: string;
  userId: string;
  placeId: string;
  role: ManagerRole;
  permissions: Permission[];
  assignedAt: Date;
}

export type ManagerRole = "owner" | "manager" | "staff" | "viewer";

export type Permission =
  | "read"
  | "write"
  | "delete"
  | "manage_staff"
  | "manage_finances"
  | "manage_reservations"
  | "publish";

// API interfaces
export interface CreatePlaceRequest {
  name: string;
  description: string;
  category: PlaceCategory;
  type: PlaceType;
  location: Location;
  address: Address;
  contact: ContactInfo;
  businessHours: BusinessHours[];
  amenities: Amenity[];
  pricing: PricingInfo;
  images: Omit<Image, "id" | "uploadedAt">[];
  capacity: Capacity;
  accessibility: Accessibility;
  policies: Policy[];
  metadata: PlaceMetadata;
}

export interface UpdatePlaceRequest extends Partial<CreatePlaceRequest> {
  id: string;
}

export interface PlaceReservationRequest {
  placeId: string;
  partySize: number;
  dateTime: Date;
  duration: number;
  specialRequests?: string;
}

export interface PlaceReservationResponse {
  reservation: Reservation;
  confirmationCode: string;
  estimatedWaitTime?: number;
}
