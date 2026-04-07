import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { PlaceEntity } from "./place.entity";

@Entity("place_images")
export class ImageEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  placeId: string;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 500 })
  thumbnail: string;

  @Column({ length: 255 })
  alt: string;

  @Column({ length: 500, nullable: true })
  caption: string;

  @Column({ type: "int" })
  width: number;

  @Column({ type: "int" })
  height: number;

  @Column({ type: "int" })
  size: number;

  @Column({ length: 10 })
  format: string;

  @Column({ type: "jsonb", default: [] })
  tags: string[];

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => PlaceEntity, (place) => place.images)
  @JoinColumn({ name: "placeId" })
  place: PlaceEntity;
}
