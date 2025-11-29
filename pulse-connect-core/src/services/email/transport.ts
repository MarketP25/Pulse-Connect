import nodemailer from "nodemailer";
import { env } from "@/env";
import { logger } from "@/lib/logger";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error("SMTP connection error:", error);
  } else {
    logger.info("SMTP server is ready to send emails");
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail({
  to,
  subject,
  template,
  context,
  attachments = [],
}: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `Pulse Connect <${env.EMAIL_FROM}>`,
      to,
      subject,
      template,
      context,
      attachments,
    });

    logger.info("Email sent:", { messageId: info.messageId, to, subject });
    return true;
  } catch (error) {
    logger.error("Email sending failed:", { error, to, subject });
    return false;
  }
}
