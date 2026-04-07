import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("pap_consent_ledger")
export class ConsentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 50 })
  channel: string; // email, sms, push, social_facebook, etc.

  @Column({ length: 50 })
  purpose: string; // promotional, transactional, educational, etc.

  @Column({ type: "jsonb", default: [] })
  scope: string[]; // contact_info, location_data, behavioral_data, etc.

  @Column({ type: "timestamp" })
  grantedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date;

  @Column({ length: 50 })
  source: string; // user_opt_in, admin_grant, etc.

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
