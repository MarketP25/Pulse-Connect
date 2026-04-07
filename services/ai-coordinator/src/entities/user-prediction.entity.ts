import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from "typeorm";

@Entity("user_predictions")
export class UserPrediction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  type:
    | "subsystem_recommendation"
    | "time_optimization"
    | "location_based"
    | "behavior_pattern"
    | "risk_alert";

  @Column({ nullable: true })
  target: string;

  @Column("decimal", { precision: 3, scale: 2, default: 0 })
  confidence: number;

  @Column("text")
  reasoning: string;

  @Column()
  suggestedAction: string;

  @Column("jsonb", { nullable: true })
  metadata: any;

  @Column({ default: false })
  actedUpon: boolean;

  @Column({ nullable: true })
  actedAt: Date;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
