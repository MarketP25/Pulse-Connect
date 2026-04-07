import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from "typeorm";

@Entity("planetary_events")
export class PlanetaryEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  subsystem: string;

  @Column()
  action: string;

  @Column("jsonb")
  context: any;

  @Column("jsonb", { nullable: true })
  location: {
    country: string;
    region: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @Column("decimal", { precision: 5, scale: 2, default: 0 })
  riskScore: number;

  @Column("jsonb", { nullable: true })
  metadata: any;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
