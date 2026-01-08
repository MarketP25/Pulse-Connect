import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('policy_versions')
export class PolicyVersion {
  @PrimaryColumn()
  version: string;

  @Column('jsonb', { nullable: true })
  council_refs?: any;

  @Column('text')
  notes: string;

  @Column('text')
  signature: string;

  @Column('timestamptz')
  activated_at: Date;

  @Column('timestamptz', { nullable: true })
  retired_at?: Date;
}
