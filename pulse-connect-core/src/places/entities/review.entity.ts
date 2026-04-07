import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { PlaceEntity } from "./place.entity";

@Entity("place_reviews")
export class ReviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  placeId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ type: "decimal", precision: 2, scale: 1 })
  rating: number;

  @Column({ length: 255, nullable: true })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "jsonb", default: [] })
  images: string[];

  @Column({ type: "jsonb", default: [] })
  aspects: Array<{
    aspect: string;
    rating: number;
    count: number;
  }>;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: "int", default: 0 })
  helpful: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => PlaceEntity, (place) => place.reviews)
  @JoinColumn({ name: "placeId" })
  place: PlaceEntity;
}
