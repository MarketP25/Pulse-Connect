import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("correlated_events")
export class CorrelatedEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("jsonb")
  primaryEvent: any;

  @Column("jsonb")
  relatedEvents: any[];

  @Column()
  correlationType: string;

  @Column("decimal", { precision: 3, scale: 2 })
  strength: number;

  @Column("text")
  description: string;

  @Column("jsonb")
  affectedSubsystems: string[];

  @Column("jsonb", { nullable: true })
  metadata: any;

  @CreateDateColumn()
  timestamp: Date;
}
