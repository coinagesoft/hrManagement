import { NextResponse, connection } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendCompanyInvitationEmail } from '@/lib/email';

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const status = searchParams.get('status') || '';

    let sql = `
      SELECT 
        c.id, c.name, c.code, c.admin_name AS admin, c.email, c.status, c.created_at,
        COUNT(u.id) AS users
      FROM companies c
      LEFT JOIN users u ON u.company_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += ` AND (LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.admin_name, '')) LIKE ? OR LOWER(COALESCE(c.email, '')) LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (status && status !== 'All') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const rows = await query<any[]>(sql, params);

    const companies = rows.map((c) => ({
      id: String(c.id),
      name: c.name,
      code: c.code || '',
      admin: c.admin || 'Unassigned',
      email: c.email || '',
      users: Number(c.users || 0),
      created: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '2026-01-01',
      status: c.status as 'Active' | 'Suspended' | 'Pending',
    }));

    return NextResponse.json({ success: true, companies });
  } catch (error: any) {
    console.error('Super companies list error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, admin, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Company name and admin email are required.' },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanAdmin = String(admin || cleanName + ' Admin').trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = (code || cleanName.replace(/[^A-Za-z]/g, '').slice(0, 3)).toUpperCase() || 'ORG';

    // 1. Check uniqueness
    const existingComp = await query<any[]>(
      'SELECT id FROM companies WHERE LOWER(name) = ? LIMIT 1',
      [cleanName.toLowerCase()]
    );
    if (existingComp.length > 0) {
      return NextResponse.json(
        { error: 'A company with this name already exists.' },
        { status: 409 }
      );
    }

    const existingUser = await query<any[]>(
      'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'A user with this admin email already exists.' },
        { status: 409 }
      );
    }

    // 2. Insert Company in 'Pending' status (until admin accepts invitation)
    const compRes = await query<any>(
      `INSERT INTO companies (name, code, email, admin_name, status, created_at)
       VALUES (?, ?, ?, ?, 'Pending', NOW())`,
      [cleanName, cleanCode, cleanEmail, cleanAdmin]
    );
    const companyId = compRes.insertId;

    // 3. Insert Admin User in 'Pending' status with a placeholder hashed password
    const tempRandomSecret = crypto.randomBytes(24).toString('hex');
    const hashedPlaceholder = await hashPassword(tempRandomSecret);

    const userRes = await query<any>(
      `INSERT INTO users 
       (company_id, employee_code, name, email, password, role, department, title, status, joined_date, created_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 'Management', 'Company Administrator', 'Pending', CURDATE(), NOW())`,
      [companyId, `${cleanCode}-001`, cleanAdmin, cleanEmail, hashedPlaceholder]
    );
    const userId = userRes.insertId;

    // 4. Generate secure invitation token
    const token = crypto.randomBytes(32).toString('hex');

    await query(
      `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'admin', 'Pending', DATE_ADD(NOW(), INTERVAL 48 HOUR), NOW())`,
      [companyId, userId, cleanEmail, token]
    );

    // 5. Construct invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/accept-invite?token=${token}`;

    // 6. Send invitation email
    const emailResult = await sendCompanyInvitationEmail({
      toEmail: cleanEmail,
      adminName: cleanAdmin,
      companyName: cleanName,
      inviteLink,
    });

    // 7. Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
       VALUES (?, 'Platform Owner', 'Company invited', 'green', ?, NOW())`,
      [companyId, `${cleanName}, Admin: ${cleanAdmin} (${cleanEmail})`]
    );

    return NextResponse.json({
      success: true,
      company: {
        id: String(companyId),
        name: cleanName,
        code: cleanCode,
        admin: cleanAdmin,
        email: cleanEmail,
        users: 1,
        status: 'Pending',
        created: new Date().toISOString().split('T')[0],
      },
      inviteLink,
      emailMode: emailResult.mode,
      message: 'Company created and invitation sent successfully.',
    });
  } catch (error: any) {
    console.error('Super create company error:', error);
    return NextResponse.json({ error: 'Failed to create company and send invite' }, { status: 500 });
  }
}
