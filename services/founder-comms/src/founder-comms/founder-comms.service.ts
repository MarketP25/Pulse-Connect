import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FounderMessage } from "./entities/founder-message.entity";
import { FounderAction } from "./entities/founder-action.entity";
import { FounderContact } from "./entities/founder-contact.entity";
import * as nodemailer from "nodemailer";

@Injectable()
export class FounderCommsService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(FounderMessage)
    private messageRepository: Repository<FounderMessage>,
    @InjectRepository(FounderAction)
    private actionRepository: Repository<FounderAction>,
    @InjectRepository(FounderContact)
    private contactRepository: Repository<FounderContact>
  ) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_SMTP_URL || "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Send signed email to founder
   */
  async sendMessage(messageData: {
    type: string;
    subject: string;
    body: string;
    policy_version: string;
    reason_code: string;
    region: string;
  }): Promise<FounderMessage> {
    const bodyHash = this.hashMessageBody(messageData.body);

    const message = this.messageRepository.create({
      type: messageData.type,
      subject: messageData.subject,
      body_hash: bodyHash,
      policy_version: messageData.policy_version,
      reason_code: messageData.reason_code,
      region: messageData.region,
      signed_at: new Date()
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send email
    await this.sendEmail(savedMessage, messageData.body);

    return savedMessage;
  }

  /**
   * Get message status
   */
  async getMessage(id: string): Promise<FounderMessage> {
    return this.messageRepository.findOne({ where: { id } });
  }

  /**
   * Approve action (PC365 protected)
   */
  async approveAction(actionData: {
    message_id: string;
    actor_verification: string;
    result: string;
  }): Promise<FounderAction> {
    const action = this.actionRepository.create({
      message_id: actionData.message_id,
      action_type: "approve",
      actor_verification: actionData.actor_verification,
      result: actionData.result,
      timestamp: new Date()
    });

    return this.actionRepository.save(action);
  }

  /**
   * Deny action (PC365 protected)
   */
  async denyAction(actionData: {
    message_id: string;
    actor_verification: string;
    result: string;
  }): Promise<FounderAction> {
    const action = this.actionRepository.create({
      message_id: actionData.message_id,
      action_type: "deny",
      actor_verification: actionData.actor_verification,
      result: actionData.result,
      timestamp: new Date()
    });

    return this.actionRepository.save(action);
  }

  /**
   * Rollback action (PC365 protected)
   */
  async rollbackAction(actionData: {
    message_id: string;
    actor_verification: string;
    result: string;
  }): Promise<FounderAction> {
    const action = this.actionRepository.create({
      message_id: actionData.message_id,
      action_type: "rollback",
      actor_verification: actionData.actor_verification,
      result: actionData.result,
      timestamp: new Date()
    });

    return this.actionRepository.save(action);
  }

  private hashMessageBody(body: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(body).digest("hex");
  }

  private async sendEmail(message: FounderMessage, body: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@pulsco.com",
      to: process.env.FOUNDER_EMAIL || "superadmin@pulsco.com",
      subject: message.subject,
      text: body
      // DKIM signing would be configured at SMTP level
    };

    try {
      await this.transporter.sendMail(mailOptions);
      await this.messageRepository.update(message.id, {
        delivered_at: new Date()
      });
    } catch (error) {
      console.error("Failed to send founder email:", error);
      // TODO: Implement fallback to secure inbox
    }
  }
}
