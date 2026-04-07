import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { ReservationEntity } from "./reservation.entity";
import { ReviewEntity } from "./review.entity";
import { PlaceManagerEntity } from "./place-manager.entity";
import { ImageEntity } from "./image.entity";

@Entity("places")
export class PlaceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column({ length: 50 })
  category: string;

  @Column({ length: 20, default: "physical" })
  type: string;

  @Column({ type: "jsonb" })
  location: {
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
  };

  @Column({ type: "jsonb" })
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    formatted: string;
    components: Array<{
      type: string;
      value: string;
      shortValue?: string;
    }>;
  };

  @Column({ type: "jsonb", nullable: true })
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia: Array<{
      platform: string;
      handle: string;
      url: string;
    }>;
  };

  @Column({ type: "jsonb", default: [] })
  businessHours: Array<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
    specialHours?: {
      date: string;
      open?: string;
      close?: string;
      isClosed: boolean;
      reason?: string;
    };
  }>;

  @Column({ type: "jsonb", default: [] })
  amenities: Array<{
    id: string;
    name: string;
    category: string;
    icon?: string;
    available: boolean;
    description?: string;
  }>;

  @Column({ type: "jsonb" })
  pricing: {
    currency: string;
    priceRange: string;
    averagePrice?: number;
    pricingModel: string;
    dynamicPricing?: {
      enabled: boolean;
      factors: Array<{
        type: string;
        weight: number;
        multiplier: number;
      }>;
      minPrice: number;
      maxPrice: number;
    };
  };

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: "int", default: 0 })
  reviewCount: number;

  @Column({ type: "jsonb" })
  capacity: {
    maxOccupancy: number;
    currentOccupancy?: number;
    reservations: string[]; // Reference IDs
    waitlist: Array<{
      id: string;
      userId: string;
      partySize: number;
      estimatedWaitTime: number;
      position: number;
      notified: boolean;
      createdAt: Date;
    }>;
  };

  @Column({ type: "jsonb", nullable: true })
  accessibility: {
    wheelchairAccessible: boolean;
    wheelchairAccessibleRestroom: boolean;
    hearingAccessible: boolean;
    visualAccessible: boolean;
    serviceAnimals: boolean;
    parking: {
      accessibleSpaces: number;
      totalSpaces: number;
      vanAccessible: boolean;
      valetService: boolean;
    };
    entrance: {
      level: boolean;
      ramp: boolean;
      steps: number;
      automaticDoor: boolean;
      callButton: boolean;
    };
    seating: {
      accessibleTables: number;
      totalTables: number;
      heightAdjustable: boolean;
      spaceForWheelchair: boolean;
    };
  };

  @Column({ type: "jsonb", default: [] })
  policies: Array<{
    type: string;
    title: string;
    description: string;
    required: boolean;
  }>;

  @Column({ type: "jsonb", default: {} })
  metadata: {
    tags: string[];
    keywords: string[];
    categories: string[];
    features: string[];
    certifications: Array<{
      name: string;
      issuer: string;
      date: Date;
      expires?: Date;
      verified: boolean;
    }>;
    awards: Array<{
      name: string;
      issuer: string;
      year: number;
      category?: string;
    }>;
    partnerships: Array<{
      partnerId: string;
      partnerName: string;
      type: string;
      startDate: Date;
      endDate?: Date;
    }>;
    customFields: Record<string, any>;
  };

  @Column({ length: 20, default: "active" })
  status: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false })
  featured: boolean;

  @Column({ length: 255, nullable: true })
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ReservationEntity, (reservation) => reservation.place)
  reservations: ReservationEntity[];

  @OneToMany(() => ReviewEntity, (review) => review.place)
  reviews: ReviewEntity[];

  @OneToMany(() => PlaceManagerEntity, (manager) => manager.place)
  managers: PlaceManagerEntity[];

  @OneToMany(() => ImageEntity, (image) => image.place)
  images: ImageEntity[];
}
