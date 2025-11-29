import { sendEmail } from "@/lib/email/templates/send";

export async function sendVerificationEmail(
  email: string,
  verificationCode: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/verify?code=${verificationCode}`;

  const htmlContent = `
    <!DOCTYPE html>
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
            text-align: center;
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Admin Account</h1>
          </div>
          <p>Hello,</p>
          <p>Thank you for registering as an admin for Pulse Connect. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">
              Verify Email Address
            </a>
          </div>

          <p>Or copy and paste this URL into your browser:</p>
          <p>${verificationUrl}</p>

          <p>This verification link will expire in 24 hours for security reasons.</p>

          <div class="footer">
            <p>If you did not request this verification, please ignore this email.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: "Verify Your Pulse Connect Admin Account",
    html: htmlContent,
  });
}
