export const adminCodeEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .code {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 24px;
      text-align: center;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    .warning {
      color: #c53030;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Pulse Connect Admin</h1>
    
    <p>You have been granted admin access to Pulse Connect. Below is your unique admin code:</p>
    
    <div class="code">
      {{adminCode}}
    </div>
    
    <p><strong>Important Information:</strong></p>
    <ul>
      <li>This code grants you full admin access to Pulse Connect</li>
      <li>Validity Period: {{validityPeriod}}</li>
      <li>Maximum Uses: {{maxUses}}</li>
    </ul>
    
    <p class="warning">
      ⚠️ Do not share this code with anyone. Keep it secure and confidential.
    </p>
    
    <p>
      To use your admin access:
      1. Go to <a href="{{loginUrl}}">Pulse Connect Login</a>
      2. Click on "Login with Admin Code"
      3. Enter your admin code
    </p>
    
    <div class="footer">
      <p>
        This is an automated message. Please do not reply to this email.
        If you did not request admin access, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
`;
