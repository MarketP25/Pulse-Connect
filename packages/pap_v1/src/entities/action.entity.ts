import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity("pap_actions")
@Index(["campaignId", "status"])
@Index(["recipient", "status"])
export class ActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255, nullable: true })
  campaignId: string;

  @Column({ length: 50 })
  type: string; // email_send, sms_send, push_send, social_post

  @Column({ length: 50 })
  channel: string; // email, sms, push, social_facebook, etc.

  @Column({ type: "jsonb" })
  recipient: any; // ActionRecipient

  @Column({ type: "jsonb" })
  content: any; // ActionContent

  @Column({ length: 50, default: "queued" })
  status: string; // queued, scheduled, sending, sent, delivered, opened, clicked, converted, failed, cancelled

  @Column({ length: 20, default: "normal" })
  priority: string; // low, normal, high, urgent

  @Column({ type: "timestamp", nullable: true })
  scheduledFor: Date;

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date;

  @Column({ type: "timestamp", nullable: true })
  openedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  clickedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  convertedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  failedAt: Date;

  @Column({ type: "text", nullable: true })
  failureReason: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
