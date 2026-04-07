import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("pap_subscriptions")
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  planId: string;

  @Column({ length: 50, default: "pending" })
  status: string; // pending, active, suspended, cancelled, expired

  @Column({ type: "jsonb", default: [] })
  entitlements: any[]; // Entitlement[]

  @Column({ type: "timestamp", nullable: true })
  activatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  cancelledAt: Date;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
