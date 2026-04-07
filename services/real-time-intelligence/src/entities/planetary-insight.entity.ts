import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("planetary_insights")
export class PlanetaryInsight {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: "anomaly" | "trend" | "correlation" | "prediction" | "pattern" | "alert";

  @Column("decimal", { precision: 3, scale: 2 })
  severity: number;

  @Column()
  title: string;

  @Column("text")
  description: string;

  @Column("jsonb")
  affectedEntities: string[];

  @Column("jsonb")
  recommendedActions: string[];

  @Column("decimal", { precision: 3, scale: 2 })
  confidence: number;

  @Column("jsonb")
  sourceEvent: any;

  @Column("jsonb", { nullable: true })
  metadata: any;

  @CreateDateColumn()
  timestamp: Date;
}
