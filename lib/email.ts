import nodemailer from 'nodemailer';

export interface SendInviteParams {
  toEmail: string;
  adminName: string;
  companyName: string;
  inviteLink: string;
}

export interface SendResetParams {
  toEmail: string;
  userName: string;
  resetLink: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASSWORD;
  const pass = host?.includes('gmail') && rawPass ? rawPass.replace(/\s+/g, '') : rawPass;
  const from = process.env.SMTP_FROM || `"PeopleDesk HR" <${user || 'noreply@peopledesk.com'}>`;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return { transporter, from };
  }
  return null;
}

export async function sendCompanyInvitationEmail({
  toEmail,
  adminName,
  companyName,
  inviteLink,
}: SendInviteParams): Promise<{ success: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
  const mailer = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #172033; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e5eb; }
          .header { background-color: #0e6b5c; padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 32px 28px; line-height: 1.6; }
          .badge { display: inline-block; background-color: #e1f1ed; color: #0e6b5c; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #0e6b5c; color: #ffffff !important; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; }
          .btn:hover { background-color: #0b574b; }
          .note { font-size: 13px; color: #5b6475; border-top: 1px solid #e2e5eb; padding-top: 20px; margin-top: 28px; }
          .link-box { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 12px; color: #64748b; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HR Platform</h1>
          </div>
          <div class="content">
            <span class="badge">Platform Invitation</span>
            <h2>Welcome to the team, ${adminName}!</h2>
            <p>You have been invited by the platform owner to join as the <strong>Administrator (Owner)</strong> for <strong>${companyName}</strong>.</p>
            <p>To finish setting up your company workspace and access your attendance, employees, leave management, and payroll dashboards, please set your password:</p>
            
            <div class="btn-container">
              <a href="${inviteLink}" class="btn">Activate Account & Company</a>
            </div>

            <div class="note">
              <p>This invitation link will expire in <strong>48 hours</strong>.</p>
              <p>If the button above does not work, copy and paste this link into your browser:</p>
              <div class="link-box">${inviteLink}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  if (mailer) {
    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        to: toEmail,
        subject: `You have been invited to set up ${companyName} on HR Platform`,
        html: htmlContent,
      });

      console.log(`[Email] Invitation successfully dispatched to ${toEmail} via Gmail SMTP`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send email via SMTP:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Invitation generated for ${toEmail} (${companyName}): ${inviteLink}`);
  return { success: true, mode: 'simulated' };
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetLink,
}: SendResetParams): Promise<{ success: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
  const mailer = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #172033; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e5eb; }
          .header { background-color: #0e6b5c; padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 32px 28px; line-height: 1.6; }
          .badge { display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background-color: #0e6b5c; color: #ffffff !important; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; }
          .btn:hover { background-color: #0b574b; }
          .note { font-size: 13px; color: #5b6475; border-top: 1px solid #e2e5eb; padding-top: 20px; margin-top: 28px; }
          .link-box { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 12px; color: #64748b; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HR Platform</h1>
          </div>
          <div class="content">
            <span class="badge">Security Alert</span>
            <h2>Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset the password for your account (<strong>${toEmail}</strong>).</p>
            <p>Click the button below to choose a new, secure password:</p>
            
            <div class="btn-container">
              <a href="${resetLink}" class="btn">Reset My Password</a>
            </div>

            <div class="note">
              <p>This password reset link will expire in <strong>1 hour</strong>.</p>
              <p>If you did not request this change, please ignore this email. Your password will remain unchanged.</p>
              <div class="link-box">${resetLink}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  if (mailer) {
    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        to: toEmail,
        subject: `Reset your HR Platform password`,
        html: htmlContent,
      });

      console.log(`[Email] Password reset dispatched to ${toEmail} via Gmail SMTP`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send password reset via SMTP:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Password reset link for ${toEmail}: ${resetLink}`);
  return { success: true, mode: 'simulated' };
}
