import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('geocodes')
export class Geocode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  actor: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'numeric', precision: 10, scale: 8 })
  lat: number;

  @Column({ type: 'numeric', precision: 11, scale: 8 })
  lng: number;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  confidence: number;

  @Column({ type: 'text' })
  formatted_address: string;

  @Column({ type: 'text' })
  region_code: string;

  @CreateDateColumn({ type: 'timestamptz' })
  cached_at: Date;
}
