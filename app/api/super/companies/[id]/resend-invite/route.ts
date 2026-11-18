import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { sendCompanyInvitationEmail } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = Number(id);

    // Get company and owner
    const companies = await query<any[]>(
      `SELECT c.id, c.name, c.admin_name, c.email, u.id AS user_id, u.status AS user_status
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'admin'
       WHERE c.id = ?
       LIMIT 1`,
      [companyId]
    );

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const comp = companies[0];
    const targetEmail = comp.email;
    const adminName = comp.admin_name || 'Admin';
    const userId = comp.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Company administrator user account not found' }, { status: 400 });
    }

    // Generate fresh invite token
    const token = crypto.randomBytes(32).toString('hex');

    // Expire any existing invitations for this user
    await query(
      "UPDATE invitations SET status = 'Expired' WHERE user_id = ? AND status = 'Pending'",
      [userId]
    );

    // Insert new invitation
    await query(
      `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'admin', 'Pending', DATE_ADD(NOW(), INTERVAL 48 HOUR), NOW())`,
      [companyId, userId, targetEmail, token]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/accept-invite?token=${token}`;

    // Send email
    await sendCompanyInvitationEmail({
      toEmail: targetEmail,
      adminName,
      companyName: comp.name,
      inviteLink,
    });

    // Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
       VALUES (?, 'Platform Owner', 'Invite resent', 'blue', ?, NOW())`,
      [companyId, `Invitation resent to ${adminName} (${targetEmail}) for ${comp.name}`]
    );

    return NextResponse.json({
      success: true,
      inviteLink,
      message: `Invitation resent to ${targetEmail}`,
    });
  } catch (error: any) {
    console.error('Resend invite error:', error);
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
  }
}
