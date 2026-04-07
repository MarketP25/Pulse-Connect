import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { PlaceEntity } from "./place.entity";

@Entity("place_managers")
export class PlaceManagerEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  placeId: string;

  @Column({ length: 20, default: "staff" })
  role: string;

  @Column({ type: "jsonb", default: ["read"] })
  permissions: string[];

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => PlaceEntity, (place) => place.managers)
  @JoinColumn({ name: "placeId" })
  place: PlaceEntity;
}
