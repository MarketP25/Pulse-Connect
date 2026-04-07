import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, SelectQueryBuilder } from "typeorm";
import {
  Place,
  PlaceSearchQuery,
  PlaceSearchResult,
  CreatePlaceRequest,
  UpdatePlaceRequest,
  PlaceReservationRequest,
  PlaceReservationResponse,
  PlaceAnalytics,
  PlaceManager,
  Reservation,
  Review
} from "../types/places";
import { PlaceEntity } from "../entities/place.entity";
import { ReservationEntity } from "../entities/reservation.entity";
import { ReviewEntity } from "../entities/review.entity";
import { PlaceManagerEntity } from "../entities/place-manager.entity";
import { ProximityService } from "../../proximity/proximity.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { emitPlacesEvent } from "../../csi/instrumentation";

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @InjectRepository(PlaceEntity)
    private readonly placeRepository: Repository<PlaceEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(PlaceManagerEntity)
    private readonly placeManagerRepository: Repository<PlaceManagerEntity>,
    private readonly proximityService: ProximityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Create a new place
   */
  async createPlace(request: CreatePlaceRequest, ownerId: string): Promise<Place> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create place entity
      const placeEntity = this.placeRepository.create({
        ...request,
        ownerId,
        status: "pending_review",
        verified: false,
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedPlace = await queryRunner.manager.save(PlaceEntity, placeEntity);

      // Create place manager entry for owner
      const placeManager = this.placeManagerRepository.create({
        userId: ownerId,
        placeId: savedPlace.id,
        role: "owner",
        permissions: [
          "read",
          "write",
          "delete",
          "manage_staff",
          "manage_finances",
          "manage_reservations",
          "publish"
        ],
        assignedAt: new Date()
      });

      await queryRunner.manager.save(PlaceManagerEntity, placeManager);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit("place.created", { place: savedPlace, ownerId });
      emitPlacesEvent(
        "place.created",
        String(savedPlace.location?.country || savedPlace.location?.region || "GLOBAL"),
        {
          placeId: savedPlace.id,
          ownerId,
          category: savedPlace.category,
          type: savedPlace.type
        },
        {
          riskScore: 16,
          performanceScore: 82
        }
      );

      return this.mapPlaceEntityToPlace(savedPlace);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create place: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update an existing place
   */
  async updatePlace(request: UpdatePlaceRequest, userId: string): Promise<Place> {
    const place = await this.placeRepository.findOne({
      where: { id: request.id },
      relations: ["managers"]
    });

    if (!place) {
      throw new Error("Place not found");
    }

    // Check permissions
    const manager = place.managers.find((m) => m.userId === userId);
    if (!manager || !manager.permissions.includes("write")) {
      throw new Error("Insufficient permissions to update place");
    }

    // Update place
    Object.assign(place, request, { updatedAt: new Date() });
    const updatedPlace = await this.placeRepository.save(place);

    this.eventEmitter.emit("place.updated", { place: updatedPlace, updatedBy: userId });
    emitPlacesEvent(
      "place.updated",
      String(updatedPlace.location?.country || updatedPlace.location?.region || "GLOBAL"),
      {
        placeId: updatedPlace.id,
        updatedBy: userId,
        status: updatedPlace.status
      },
      {
        riskScore: 22,
        performanceScore: 80
      }
    );

    return this.mapPlaceEntityToPlace(updatedPlace);
  }

  /**
   * Get place by ID
   */
  async getPlaceById(id: string, userId?: string): Promise<Place> {
    const place = await this.placeRepository.findOne({
      where: { id },
      relations: ["reservations", "reviews", "managers", "images"]
    });

    if (!place) {
      throw new Error("Place not found");
    }

    // Track view for analytics
    this.eventEmitter.emit("place.viewed", { placeId: id, userId });

    return this.mapPlaceEntityToPlace(place);
  }

  /**
   * Search places with advanced filtering
   */
  async searchPlaces(query: PlaceSearchQuery): Promise<PlaceSearchResult> {
    const qb = this.placeRepository
      .createQueryBuilder("place")
      .leftJoinAndSelect("place.images", "images")
      .leftJoinAndSelect("place.reviews", "reviews")
      .where("place.status = :status", { status: "active" });

    // Apply filters
    if (query.query) {
      qb.andWhere("(place.name ILIKE :query OR place.description ILIKE :query)", {
        query: `%${query.query}%`
      });
    }

    if (query.category && query.category.length > 0) {
      qb.andWhere("place.category IN (:...categories)", { categories: query.category });
    }

    if (query.type && query.type.length > 0) {
      qb.andWhere("place.type IN (:...types)", { types: query.type });
    }

    if (query.rating) {
      qb.andWhere("place.rating >= :rating", { rating: query.rating });
    }

    if (query.priceRange && query.priceRange.length > 0) {
      qb.andWhere("place.priceRange IN (:...priceRanges)", { priceRanges: query.priceRange });
    }

    // Location-based filtering
    if (query.location) {
      const { latitude, longitude, radius = 5000 } = query.location; // 5km default
      // Use PostGIS or similar for location queries
      qb.andWhere("ST_DWithin(place.location, ST_MakePoint(:lng, :lat)::geography, :radius)", {
        lng: longitude,
        lat: latitude,
        radius
      });
    }

    // Open now filter
    if (query.openNow) {
      const now = new Date();
      const dayOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
      ][now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5);

      qb.andWhere(
        `place.businessHours @> '[{"day": "${dayOfWeek}", "isOpen": true, "open": "${currentTime}", "close": "23:59"}]'`
      );
    }

    // Sorting
    const sortBy = query.sortBy || "relevance";
    const sortOrder = query.sortOrder || "desc";

    switch (sortBy) {
      case "distance":
        if (query.location) {
          qb.orderBy("ST_Distance(place.location, ST_MakePoint(:lng, :lat))", sortOrder);
          qb.setParameters({ lng: query.location.longitude, lat: query.location.latitude });
        }
        break;
      case "rating":
        qb.orderBy("place.rating", sortOrder);
        break;
      case "price":
        qb.orderBy("place.priceRange", sortOrder);
        break;
      case "popularity":
        qb.orderBy("place.reviewCount", sortOrder);
        break;
      case "newest":
        qb.orderBy("place.createdAt", sortOrder);
        break;
      default:
        qb.orderBy("place.rating", "DESC");
    }

    // Pagination
    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;
    qb.limit(limit).offset(offset);

    const [places, total] = await qb.getManyAndCount();

    // Generate facets
    const facets = await this.generateSearchFacets(query);

    // Generate suggestions
    const suggestions = await this.generateSearchSuggestions(query.query);

    emitPlacesEvent(
      "place.search.executed",
      query.location ? "LOCAL" : "GLOBAL",
      {
        resultCount: total,
        limit,
        offset,
        query: query.query || null
      },
      {
        riskScore: 8,
        performanceScore: 90
      }
    );

    return {
      places: places.map((p) => this.mapPlaceEntityToPlace(p)),
      total,
      facets,
      suggestions
    };
  }

  /**
   * Create a reservation
   */
  async createReservation(
    request: PlaceReservationRequest,
    userId: string
  ): Promise<PlaceReservationResponse> {
    const place = await this.placeRepository.findOne({
      where: { id: request.placeId },
      relations: ["reservations"]
    });

    if (!place) {
      throw new Error("Place not found");
    }

    // Check availability
    const isAvailable = await this.checkAvailability(
      request.placeId,
      request.dateTime,
      request.duration
    );
    if (!isAvailable) {
      throw new Error("Requested time slot is not available");
    }

    // Create reservation
    const reservation = this.reservationRepository.create({
      placeId: request.placeId,
      userId,
      partySize: request.partySize,
      dateTime: request.dateTime,
      duration: request.duration,
      status: "pending",
      specialRequests: request.specialRequests,
      createdAt: new Date()
    });

    const savedReservation = await this.reservationRepository.save(reservation);

    this.eventEmitter.emit("reservation.created", {
      reservation: savedReservation,
      placeId: request.placeId,
      userId
    });
    emitPlacesEvent(
      "reservation.created",
      String(place.location?.country || place.location?.region || "GLOBAL"),
      {
        reservationId: savedReservation.id,
        placeId: request.placeId,
        userId,
        partySize: request.partySize
      },
      {
        riskScore: 20,
        performanceScore: 86
      }
    );

    return {
      reservation: this.mapReservationEntityToReservation(savedReservation),
      confirmationCode: this.generateConfirmationCode(savedReservation.id)
    };
  }

  /**
   * Add a review
   */
  async addReview(
    placeId: string,
    userId: string,
    rating: number,
    content: string,
    title?: string
  ): Promise<Review> {
    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) {
      throw new Error("Place not found");
    }

    // Check if user already reviewed this place
    const existingReview = await this.reviewRepository.findOne({
      where: { placeId, userId }
    });

    if (existingReview) {
      throw new Error("User has already reviewed this place");
    }

    const review = this.reviewRepository.create({
      placeId,
      userId,
      rating,
      content,
      title,
      verified: false, // Could be verified based on reservation history
      helpful: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update place rating
    await this.updatePlaceRating(placeId);

    this.eventEmitter.emit("review.added", { review: savedReview, placeId, userId });
    emitPlacesEvent(
      "review.added",
      String(place.location?.country || place.location?.region || "GLOBAL"),
      {
        reviewId: savedReview.id,
        placeId,
        userId,
        rating
      },
      {
        riskScore: 12,
        performanceScore: 88
      }
    );

    return this.mapReviewEntityToReview(savedReview);
  }

  /**
   * Get place analytics
   */
  async getPlaceAnalytics(
    placeId: string,
    period: { start: Date; end: Date }
  ): Promise<PlaceAnalytics> {
    // This would aggregate data from various sources
    // For now, return mock data structure
    const metrics = await this.aggregatePlaceMetrics(placeId, period);
    const trends = await this.generateTrendsData(placeId, period);
    const insights = await this.generateInsights(placeId, metrics);
    emitPlacesEvent(
      "place.analytics.generated",
      "GLOBAL",
      {
        placeId,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString()
      },
      {
        riskScore: 10,
        performanceScore: 91
      }
    );

    return {
      placeId,
      period: {
        start: period.start,
        end: period.end,
        granularity: "day"
      },
      metrics,
      trends,
      insights
    };
  }

  /**
   * Check availability for a time slot
   */
  private async checkAvailability(
    placeId: string,
    dateTime: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = new Date(dateTime.getTime() + duration * 60000);

    const conflictingReservations = await this.reservationRepository
      .createQueryBuilder("reservation")
      .where("reservation.placeId = :placeId", { placeId })
      .andWhere("reservation.status IN (:...statuses)", { statuses: ["confirmed", "pending"] })
      .andWhere(
        "(reservation.dateTime <= :startTime AND DATEADD(minute, reservation.duration, reservation.dateTime) > :startTime) OR " +
          "(reservation.dateTime < :endTime AND DATEADD(minute, reservation.duration, reservation.dateTime) >= :endTime) OR " +
          "(reservation.dateTime >= :startTime AND DATEADD(minute, reservation.duration, reservation.dateTime) <= :endTime)",
        { startTime: dateTime, endTime }
      )
      .getCount();

    return conflictingReservations === 0;
  }

  /**
   * Update place rating after new review
   */
  private async updatePlaceRating(placeId: string): Promise<void> {
    const result = await this.reviewRepository
      .createQueryBuilder("review")
      .select("AVG(review.rating)", "average")
      .addSelect("COUNT(review.id)", "count")
      .where("review.placeId = :placeId", { placeId })
      .getRawOne();

    await this.placeRepository.update(placeId, {
      rating: parseFloat(result.average) || 0,
      reviewCount: parseInt(result.count) || 0,
      updatedAt: new Date()
    });
  }

  /**
   * Generate search facets
   */
  private async generateSearchFacets(query: PlaceSearchQuery): Promise<any[]> {
    // Implementation for generating search facets
    return [];
  }

  /**
   * Generate search suggestions
   */
  private async generateSearchSuggestions(query?: string): Promise<string[]> {
    // Implementation for generating search suggestions
    return [];
  }

  /**
   * Aggregate place metrics
   */
  private async aggregatePlaceMetrics(
    placeId: string,
    period: { start: Date; end: Date }
  ): Promise<any> {
    // Mock implementation
    return {
      views: 1250,
      searches: 340,
      clicks: 89,
      bookings: 23,
      revenue: 1250.5,
      averageRating: 4.2,
      reviewCount: 45,
      occupancyRate: 0.75,
      customerSatisfaction: 4.1
    };
  }

  /**
   * Generate trends data
   */
  private async generateTrendsData(
    placeId: string,
    period: { start: Date; end: Date }
  ): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Generate insights
   */
  private async generateInsights(placeId: string, metrics: any): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Generate confirmation code
   */
  private generateConfirmationCode(reservationId: string): string {
    return `RES-${reservationId.slice(-8).toUpperCase()}`;
  }

  // Mapping functions
  private mapPlaceEntityToPlace(entity: any): Place {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      type: entity.type,
      location: entity.location,
      address: entity.address,
      contact: entity.contact,
      businessHours: entity.businessHours,
      amenities: entity.amenities,
      pricing: entity.pricing,
      images: entity.images,
      rating: entity.rating,
      reviews: entity.reviews?.map((r) => this.mapReviewEntityToReview(r)),
      capacity: entity.capacity,
      accessibility: entity.accessibility,
      policies: entity.policies,
      metadata: entity.metadata,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      verified: entity.verified,
      featured: entity.featured
    };
  }

  private mapReservationEntityToReservation(entity: any): Reservation {
    return {
      id: entity.id,
      userId: entity.userId,
      partySize: entity.partySize,
      dateTime: entity.dateTime,
      duration: entity.duration,
      status: entity.status,
      specialRequests: entity.specialRequests,
      createdAt: entity.createdAt
    };
  }

  private mapReviewEntityToReview(entity: any): Review {
    return {
      id: entity.id,
      userId: entity.userId,
      placeId: entity.placeId,
      rating: entity.rating,
      title: entity.title,
      content: entity.content,
      images: entity.images,
      aspects: entity.aspects,
      verified: entity.verified,
      helpful: entity.helpful,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}
