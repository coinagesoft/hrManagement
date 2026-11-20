import { NextResponse, connection } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No invitation token provided.' }, { status: 400 });
    }

    const rows = await query<any[]>(
      `SELECT i.*, c.name AS company_name, c.status AS company_status, u.name AS user_name, u.role AS user_role, u.department AS user_department, u.title AS user_title
       FROM invitations i
       JOIN companies c ON i.company_id = c.id
       JOIN users u ON i.user_id = u.id
       WHERE i.token = ?
       LIMIT 1`,
      [token]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'This invitation link is invalid or does not exist.' },
        { status: 404 }
      );
    }

    const inv = rows[0];

    if (inv.status === 'Accepted') {
      return NextResponse.json(
        { valid: false, alreadyAccepted: true, error: 'This invitation has already been accepted. You can sign in directly.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(inv.expires_at);
    if (inv.status === 'Expired' || now > expiresAt) {
      return NextResponse.json(
        { valid: false, expired: true, error: 'This invitation link has expired. Please contact support to resend an invite.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: inv.email,
      userName: inv.user_name,
      companyName: inv.company_name,
      role: inv.user_role || inv.role || 'employee',
      department: inv.user_department || null,
      title: inv.user_title || null,
    });
  } catch (error: any) {
    console.error('Validate invite error:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate invitation.' }, { status: 500 });
  }
}
