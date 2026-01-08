export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export class EmailConnector {
  private provider: "ses" | "sendgrid" | "smtp" = "ses";

  /**
   * Set email provider
   */
  setProvider(provider: "ses" | "sendgrid" | "smtp"): void {
    this.provider = provider;
  }

  /**
   * Send email via configured provider
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    console.log(`Sending email via ${this.provider}:`, message);
    // Stub implementation - assume success
    return true;
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<boolean[]> {
    return Promise.all(messages.map((msg) => this.sendEmail(msg)));
  }
}
