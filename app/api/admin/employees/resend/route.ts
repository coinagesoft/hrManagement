import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendEmployeeInvitationEmail } from '@/lib/email';
import { getCompanyInvitationAttachments } from '@/lib/invitation-docs';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    // Lookup employee
    const rows = await query<any[]>(
      `SELECT id, name, email, role, department, status 
       FROM users 
       WHERE id = ? AND company_id = ? 
       LIMIT 1`,
      [Number(employeeId), companyId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const emp = rows[0];

    // Expire any existing invitations for this user
    await query(
      "UPDATE invitations SET status = 'Expired' WHERE user_id = ? AND status = 'Pending'",
      [emp.id]
    );

    // Generate fresh invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Store in invitations table with 7 day expiry
    await query(
      `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [companyId, emp.id, emp.email, inviteToken, emp.role || 'employee']
    );

    // Fetch company name
    const compRows = await query<any[]>('SELECT name FROM companies WHERE id = ?', [companyId]);
    const companyName = compRows[0]?.name || 'Company';

    // Build invite link
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    const inviteLink = `${origin}/accept-invite?token=${inviteToken}`;

    // Dispatch invitation email with active invitation documents attached
    const attachments = await getCompanyInvitationAttachments(companyId);
    const mailRes = await sendEmployeeInvitationEmail({
      toEmail: emp.email,
      employeeName: emp.name,
      companyName,
      role: emp.role || 'employee',
      department: emp.department,
      inviteLink,
      attachments,
    });

    // Audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Invite resent', 'blue', ?, NOW())`,
      [companyId, emp.id, emp.name, `Resent invitation email to ${emp.name} (${emp.email})`]
    );

    return NextResponse.json({
      success: true,
      inviteLink,
      emailSent: mailRes.success,
      message: `Invitation email resent to ${emp.email}.`,
    });
  } catch (error: any) {
    console.error('Resend employee invite error:', error);
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
  }
}
