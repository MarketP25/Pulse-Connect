import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { PlaceEntity } from "./place.entity";

@Entity("place_reservations")
export class ReservationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  placeId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ type: "int" })
  partySize: number;

  @Column({ type: "timestamp" })
  dateTime: Date;

  @Column({ type: "int" }) // minutes
  duration: number;

  @Column({ length: 20, default: "pending" })
  status: string;

  @Column({ type: "text", nullable: true })
  specialRequests: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => PlaceEntity, (place) => place.reservations)
  @JoinColumn({ name: "placeId" })
  place: PlaceEntity;
}
