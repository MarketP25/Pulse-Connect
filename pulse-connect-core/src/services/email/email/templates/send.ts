// src/lib/email/templates/send.ts

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { to, subject, html, text, from = "no-reply@pulseconnect.io" } = payload;

  // TODO: swap console.log for your real provider call
  console.log("📤 Sending email");
  console.log({ to, from, subject });
  console.log("HTML:", html);
  if (text) {
    console.log("Text:", text);
  }

  // simulate async transport
  await new Promise((resolve) => setTimeout(resolve, 300));
}
