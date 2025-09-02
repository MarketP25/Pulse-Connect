// File: src/lib/email/templates/announcement.ts

import { sendEmail } from "@/lib/email/templates/send";

interface AnnouncementEmailData {
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  createdBy: string;
}

export async function sendAnnouncementEmail(
  to: string,
  data: AnnouncementEmailData
): Promise<void> {
  const priorityColors = {
    low: "#4CAF50",
    medium: "#FFC107",
    high: "#F44336",
  } as const;

  const priorityBadge = `<span style="
      background-color: ${priorityColors[data.priority]};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
    ">${data.priority.toUpperCase()} Priority</span>`;

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <style>
      .container {
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      .title {
        font-size: 24px;
        color: #333;
        margin: 10px 0;
      }
      .message {
        line-height: 1.6;
        color: #444;
        margin: 20px 0;
      }
      .meta {
        font-size: 14px;
        color: #666;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Pulse Connect Announcement</h1>
        ${priorityBadge}
      </div>

      <h2 class="title">${data.title}</h2>

      <div class="message">
        ${data.message.replace(/\n/g, "<br>")}
      </div>

      <div class="meta">
        <p>Sent by: ${data.createdBy}</p>
        <p>Sent on: ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
  </body>
</html>`;

  await sendEmail({
    to,
    subject: `[Pulse Connect] ${data.priority.toUpperCase()}: ${data.title}`,
    html: htmlContent,
  });
}