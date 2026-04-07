import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("pap_campaigns")
export class CampaignEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 50 })
  type: string; // promotional, transactional, educational, etc.

  @Column({ length: 50, default: "draft" })
  status: string; // draft, scheduled, running, paused, completed, cancelled, failed

  @Column({ type: "jsonb", default: [] })
  channels: string[]; // email, sms, push, social_facebook, etc.

  @Column({ type: "jsonb" })
  audience: any; // Audience definition

  @Column({ type: "jsonb" })
  content: any; // Campaign content

  @Column({ type: "jsonb" })
  schedule: any; // Schedule configuration

  @Column({ type: "jsonb" })
  goals: any; // Campaign goals

  @Column({ type: "jsonb" })
  budget: any; // Budget configuration

  @Column({ type: "jsonb", default: {} })
  targeting: any; // Proximity targeting

  @Column({ length: 255 })
  createdBy: string;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
