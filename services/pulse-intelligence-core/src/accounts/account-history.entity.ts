import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from "typeorm";

export enum AccountAction {
  CREATE = "create",
  MODIFY = "modify",
  DEACTIVATE = "deactivate",
  DELETE = "delete"
}

export enum ActorType {
  FOUNDER = "founder",
  SYSTEM = "system",
  EDGE = "edge"
}

@Entity("account_history")
export class AccountHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column("uuid")
  user_id: string;

  @Column("enum", { enum: AccountAction })
  action: AccountAction;

  @Column("enum", { enum: ActorType })
  actor_type: ActorType;

  @Column("text")
  reason_code: string;

  @Column("text")
  policy_version: string;

  @Column("text")
  device_fingerprint: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @Column("text", { nullable: true })
  prev_hash: string;

  @Column("text", { nullable: true })
  curr_hash: string;
}
