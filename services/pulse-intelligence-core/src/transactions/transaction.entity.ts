import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions_ledger')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  currency: string;

  @Column({ type: 'text' })
  subsystem: string;

  @Column({ type: 'text' })
  region: string;

  @Column({ type: 'text' })
  status: TransactionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'text', nullable: true })
  prev_hash: string;

  @Column({ type: 'text', nullable: true })
  curr_hash: string;

  @Column({ type: 'text' })
  reason_code: string;

  @Column({ type: 'text' })
  policy_version: string;
}
