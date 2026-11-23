import nodemailer from 'nodemailer';

export interface SendInviteParams {
  toEmail: string;
  adminName: string;
  companyName: string;
  inviteLink: string;
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: string | Buffer;
  contentType?: string;
}

export interface SendEmployeeInviteParams {
  toEmail: string;
  employeeName: string;
  companyName: string;
  role: string;
  department?: string;
  inviteLink: string;
  attachments?: EmailAttachment[];
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
  attachments,
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

            ${attachments && attachments.length > 0 ? `
              <div style="margin: 24px 0; padding: 16px 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <h4 style="margin: 0 0 8px; color: #166534; font-size: 14px;">
                  📎 Attached Onboarding Documents (${attachments.length} attached)
                </h4>
                <p style="margin: 0 0 10px; font-size: 13px; color: #15803d;">
                  Please find the following company documents attached to this email for your review:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #14532d; line-height: 1.6;">
                  ${attachments.map(att => `<li><strong>${att.filename}</strong></li>`).join('')}
                </ul>
              </div>
            ` : ''}

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
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });

      console.log(`[Email] Employee invitation successfully dispatched to ${toEmail} via Gmail SMTP with ${attachments?.length || 0} attachment(s)`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send employee invitation via SMTP:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Employee invitation for ${toEmail} (${companyName}) with ${attachments?.length || 0} attachment(s): ${inviteLink}`);
  return { success: true, mode: 'simulated' };
}

export interface SendLeaveAutoApprovedEmailParams {
  toEmail: string;
  hrName: string;
  employeeName: string;
  employeeCode: string;
  department?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  daysCount: number;
  reason: string;
  requestedAt: string;
  initialCredits: number;
  deductedCredits: number;
  remainingCredits: number;
  companyName: string;
}

export async function sendLeaveAutoApprovedEmail({
  toEmail,
  hrName,
  employeeName,
  employeeCode,
  department,
  leaveType,
  fromDate,
  toDate,
  daysCount,
  reason,
  requestedAt,
  initialCredits,
  deductedCredits,
  remainingCredits,
  companyName,
}: SendLeaveAutoApprovedEmailParams): Promise<{ success: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
  const mailer = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #172033; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #0e6b5c 0%, #15806e 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 28px 24px; line-height: 1.6; }
          .badge { display: inline-block; background-color: #d1fae5; color: #065f46; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .notice-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 4px; margin: 18px 0; font-size: 14px; color: #065f46; }
          .table { width: 100%; margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: collapse; font-size: 13px; }
          .table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          .table td.label { font-weight: 600; color: #64748b; width: 40%; }
          .table td.val { font-weight: 600; color: #0f172a; }
          .balance-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 20px; }
          .balance-grid { display: flex; justify-content: space-between; text-align: center; margin-top: 10px; }
          .balance-item { flex: 1; padding: 8px; }
          .balance-num { font-size: 18px; font-weight: 700; }
          .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HR Management Portal</h1>
            <p>${companyName} &middot; Automatic Leave System</p>
          </div>
          <div class="content">
            <span class="badge">Automatic Approval Notice</span>
            <h2 style="margin: 0 0 10px; font-size: 19px; color: #0f172a;">Leave Request Auto-Approved After 48 Hours</h2>
            <p style="margin: 0 0 12px; font-size: 14px; color: #475569;">
              Hello ${hrName || 'HR Team'},
            </p>
            <div class="notice-box">
              <strong>48-Hour Inactivity Rule:</strong> This leave request was submitted <strong>5 or more days in advance</strong> and the employee maintained a sufficient leave credit balance. Because no HR decision was recorded within <strong>48 hours (2 days)</strong> of submission, the system has automatically approved the leave.
            </div>

            <table class="table">
              <tr>
                <td class="label">Employee</td>
                <td class="val">${employeeName} (${employeeCode})</td>
              </tr>
              ${department ? `
              <tr>
                <td class="label">Department</td>
                <td class="val">${department}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="label">Leave Type</td>
                <td class="val">${leaveType}</td>
              </tr>
              <tr>
                <td class="label">Leave Period</td>
                <td class="val">${fromDate} to ${toDate} (${daysCount} day${daysCount > 1 ? 's' : ''})</td>
              </tr>
              <tr>
                <td class="label">Requested On</td>
                <td class="val">${requestedAt}</td>
              </tr>
              <tr>
                <td class="label">Reason Provided</td>
                <td class="val">${reason}</td>
              </tr>
              <tr>
                <td class="label">Status</td>
                <td class="val" style="color: #059669;">Approved Automatically</td>
              </tr>
            </table>

            <div class="balance-card">
              <h4 style="margin: 0; color: #065f46; font-size: 14px;">Leave Balance Summary (${leaveType})</h4>
              <table style="width: 100%; margin-top: 10px; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Prior Available Credits:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${initialCredits.toFixed(1)} days</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #dc2626;">Deducted for this Leave:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #dc2626;">-${deductedCredits.toFixed(1)} day${deductedCredits > 1 ? 's' : ''}</td>
                </tr>
                <tr style="border-top: 1px solid #bbf7d0;">
                  <td style="padding: 8px 0 0; font-weight: 700; color: #065f46;">Remaining Available Credits:</td>
                  <td style="padding: 8px 0 0; text-align: right; font-weight: 800; font-size: 16px; color: #059669;">${remainingCredits.toFixed(1)} days</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              You can review all team attendance and approvals anytime in the <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/hr/leaves" style="color: #0e6b5c; text-decoration: underline; font-weight: 600;">HR Approvals Dashboard</a>.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${companyName} &middot; PeopleDesk HR Automated Attendance System
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
        subject: `[Auto-Approved] ${employeeName}'s ${leaveType} (${daysCount}d) - 48h Auto-Approval`,
        html: htmlContent,
      });
      console.log(`[Email] Auto-approval notification sent to HR (${toEmail}) for employee ${employeeName}`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send auto-approval email to HR:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Auto-approval email to ${toEmail} for ${employeeName} (${leaveType})`);
  return { success: true, mode: 'simulated' };
}

export interface SendRequestRejectedParams {
  toEmail: string;
  employeeName: string;
  companyName: string;
  requestType: string;
  period: string;
  employeeReason: string;
  rejectionReason: string;
  deciderName: string;
}

export async function sendRequestRejectedEmail({
  toEmail,
  employeeName,
  companyName,
  requestType,
  period,
  employeeReason,
  rejectionReason,
  deciderName,
}: SendRequestRejectedParams): Promise<{ success: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
  const mailer = getTransporter();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #be123c; color: white; padding: 28px 32px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 32px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
          .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          .details-table td.label { color: #64748b; font-weight: 500; width: 35%; }
          .details-table td.val { color: #0f172a; font-weight: 600; }
          .reason-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Request Status: Rejected</h1>
            <p>${companyName} &middot; PeopleDesk HR Notification</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; margin-top: 0;">Hi <strong>${employeeName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Your <strong>${requestType}</strong> request for <strong>${period}</strong> has been reviewed and was <strong>rejected</strong> by HR (${deciderName}).
            </p>

            <table class="details-table">
              <tr>
                <td class="label">Request Type</td>
                <td class="val">${requestType}</td>
              </tr>
              <tr>
                <td class="label">Dates Requested</td>
                <td class="val">${period}</td>
              </tr>
              <tr>
                <td class="label">Your Request Note</td>
                <td class="val">${employeeReason || '—'}</td>
              </tr>
              <tr>
                <td class="label">Reviewed By</td>
                <td class="val">${deciderName}</td>
              </tr>
            </table>

            <div class="reason-box">
              <h4 style="margin: 0; color: #9f1239; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Rejection Reason from HR</h4>
              <p style="margin: 8px 0 0; color: #881337; font-size: 14px; font-weight: 500; line-height: 1.5;">
                "${rejectionReason}"
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              You can log into your account anytime to view your updated request history or reach out to HR if you have any questions.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${companyName} &middot; PeopleDesk HR Portal
          </div>
        </div>
      </body>
    </html>
  `;

  if (mailer && toEmail) {
    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        to: toEmail,
        subject: `[Update] Your ${requestType} request was rejected by HR`,
        html: htmlContent,
      });
      console.log(`[Email] Rejection notification sent to ${toEmail}`);
      return { success: true, mode: 'smtp' };
    } catch (err: any) {
      console.error('[Email] Failed to send rejection email:', err.message);
      return { success: false, mode: 'smtp', error: err.message };
    }
  }

  console.log(`[Email-Simulation] Rejection email to ${toEmail} for ${requestType} (${rejectionReason})`);
  return { success: true, mode: 'simulated' };
}
