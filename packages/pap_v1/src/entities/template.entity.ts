import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("pap_templates")
export class TemplateEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 50 })
  type: string; // promotional, transactional, etc.

  @Column({ length: 50 })
  channel: string; // email, sms, push, etc.

  @Column({ type: "text", nullable: true })
  subject: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "jsonb", default: [] })
  variables: any[]; // TemplateVariable[]

  @Column({ type: "jsonb", default: { enabled: false, languages: [], fallbackLanguage: "en" } })
  localization: any; // TemplateLocalization

  @Column({ type: "jsonb", default: [] })
  tags: string[];

  @Column({ length: 255 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
