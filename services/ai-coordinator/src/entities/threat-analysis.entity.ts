import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from "typeorm";

@Entity("threat_analyses")
export class ThreatAnalysis {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  type: "fraud" | "security" | "compliance" | "performance" | "anomaly";

  @Column("decimal", { precision: 3, scale: 2 })
  severity: number;

  @Column("text")
  description: string;

  @Column("jsonb")
  affectedSubsystems: string[];

  @Column("jsonb")
  indicators: any;

  @Column("jsonb", { nullable: true })
  mitigation: any;

  @Column({ default: "active" })
  status: "active" | "mitigated" | "resolved" | "false_positive";

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column("jsonb", { nullable: true })
  metadata: any;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}
