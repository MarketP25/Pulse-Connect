export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export class SMSConnector {
  private provider: "twilio" | "messagebird" = "twilio";

  /**
   * Set SMS provider
   */
  setProvider(provider: "twilio" | "messagebird"): void {
    this.provider = provider;
  }

  /**
   * Send SMS via configured provider
   */
  async sendSMS(message: SMSMessage): Promise<boolean> {
    console.log(`Sending SMS via ${this.provider}:`, message);
    // Stub implementation - assume success
    return true;
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<boolean[]> {
    return Promise.all(messages.map((msg) => this.sendSMS(msg)));
  }
}
