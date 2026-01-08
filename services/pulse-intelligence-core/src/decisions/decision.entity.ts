import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class DecisionAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  actor: string;

  @Column('text')
  subsystem: string;

  @Column('text')
  action: string;

  @Column('text', { nullable: true })
  request_id: string;

  @Column('text')
  reason_code: string;

  @Column('text')
  policy_version: string;

  @Column('timestamptz')
  created_at: Date;

  @Column('text', { nullable: true })
  prev_hash: string;

  @Column('text', { nullable: true })
  curr_hash: string;

  // Decision-specific fields
  @Column('text')
  decision: string;

  @Column('jsonb')
  context: any;

  @Column('text')
  purpose: string;

  @Index()
  @Column('uuid')
  user_id: string;

  @Column('text')
  region: string;
}
