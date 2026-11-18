import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, type AuthUser, type AuthRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // 1. Fetch and validate invitation
    const rows = await query<any[]>(
      `SELECT i.*, c.id AS company_id, c.name AS company_name, u.id AS user_id, u.name AS user_name, u.role AS user_role, u.employee_code
       FROM invitations i
       JOIN companies c ON i.company_id = c.id
       JOIN users u ON i.user_id = u.id
       WHERE i.token = ?
       LIMIT 1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid invitation link.' }, { status: 404 });
    }

    const inv = rows[0];

    if (inv.status === 'Accepted') {
      return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 400 });
    }

    if (inv.status === 'Expired' || new Date() > new Date(inv.expires_at)) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    // 2. Hash new password
    const hashed = await hashPassword(password);

    // 3. Activate user with new password
    await query(
      `UPDATE users 
       SET password = ?, status = 'Active', updated_at = NOW() 
       WHERE id = ?`,
      [hashed, inv.user_id]
    );

    // 4. Activate company
    await query(
      `UPDATE companies 
       SET status = 'Active', updated_at = NOW() 
       WHERE id = ?`,
      [inv.company_id]
    );

    // 5. Mark invitation as Accepted
    await query(
      `UPDATE invitations 
       SET status = 'Accepted', accepted_at = NOW() 
       WHERE id = ?`,
      [inv.id]
    );

    // 6. Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Invite accepted', 'green', ?, NOW())`,
      [inv.company_id, inv.user_id, inv.user_name, `${inv.user_name} activated company ${inv.company_name} and set admin password`]
    );

    // 7. Establish authenticated session
    const authUser: AuthUser = {
      id: inv.user_id,
      companyId: inv.company_id,
      companyName: inv.company_name,
      employeeCode: inv.employee_code,
      name: inv.user_name,
      email: inv.email,
      role: inv.user_role as AuthRole,
      title: 'Company Administrator',
    };

    const sessionToken = await createSessionToken(authUser);
    const cookieStore = await cookies();
    cookieStore.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: authUser,
      redirectTo: `/${authUser.role}`,
      message: 'Account and company activated successfully!',
    });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to activate account.' }, { status: 500 });
  }
}
