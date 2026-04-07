import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

export enum UserStatus {
  ACTIVE = "active",
  DEACTIVATED = "deactivated",
  DELETED = "deleted"
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text", { unique: true })
  email: string;

  @Column("text", { select: false })
  password_hash: string;

  @Column("text", { nullable: true })
  phone: string;

  @Column("text")
  region: string;

  @Column("enum", { enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: "text", nullable: true, select: false })
  two_factor_secret: string;

  @Column({ type: "boolean", default: false })
  two_factor_enabled: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;
}
