import nodemailer from 'nodemailer';

export interface SendInviteParams {
  toEmail: string;
  adminName: string;
  companyName: string;
  inviteLink: string;
}

export interface SendEmployeeInviteParams {
  toEmail: string;
  employeeName: string;
  companyName: string;
  role: string;
  department?: string;
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

export async function sendEmployeeInvitationEmail({
  toEmail,
  employeeName,
  companyName,
  role,
  department,
  inviteLink,
}: SendEmployeeInviteParams): Promise<{ success: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
  const mailer = getTransporter();
  const roleLabel = role.toLowerCase() === 'hr' ? 'HR Manager' : role.toLowerCase() === 'admin' ? 'Administrator' : 'Employee';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #172033; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e5eb; }
          .header { background: linear-gradient(135deg, #0e6b5c 0%, #15806e 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 32px 28px; line-height: 1.6; }
          .badge { display: inline-block; background-color: #e1f1ed; color: #0e6b5c; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
          .welcome-title { margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #0f172a; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background-color: #0e6b5c; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(14, 107, 92, 0.2); }
          .btn:hover { background-color: #0b574b; }
          .note { font-size: 13px; color: #64748b; border-top: 1px solid #e2e5eb; padding-top: 20px; margin-top: 28px; }
          .link-box { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-size: 12px; color: #475569; margin-top: 8px; }
          .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e5eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PeopleDesk HR</h1>
            <p>Employee Portal & Workplace Management</p>
          </div>
          <div class="content">
            <span class="badge">${roleLabel} Invitation</span>
            <h2 class="welcome-title">Welcome to the team, ${employeeName}!</h2>
            <p>You have been invited by your organization to join <strong>${companyName}</strong> on the PeopleDesk HR Portal.</p>
            
            <table style="width: 100%; margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Organization</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Role</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${roleLabel}</td>
              </tr>
              ${department ? `
              <tr>
                <td style="padding: 10px 16px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Department</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${department}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 16px; color: #64748b;">Sign-in Email</td>
                <td style="padding: 10px 16px; font-weight: 600; color: #0f172a;">${toEmail}</td>
              </tr>
            </table>

            <p>To activate your profile, record your attendance, view calendar holidays, and submit leave or WFH requests, please click the button below to set your secure password:</p>
            
            <div class="btn-container">
              <a href="${inviteLink}" class="btn" target="_blank">Activate Account & Set Password</a>
            </div>

            <div class="note">
              <p><strong>Note:</strong> This activation link will expire in <strong>7 days</strong>.</p>
              <p>If the button above does not work, copy and paste this link into your browser:</p>
              <div class="link-box">${inviteLink}</div>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${companyName} &middot; Powered by PeopleDesk HR Platform
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
        subject: `Welcome to ${companyName}! Activate your ${roleLabel.toLowerCase()} account`,
        html: htmlContent,
      });

      console.log(`[Email] Employee invitation successfully dispatched to ${toEmail} via Gmail SMTP`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send employee invitation via SMTP:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Employee invitation for ${toEmail} (${companyName}): ${inviteLink}`);
  return { success: true, mode: 'simulated' };
}
