import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  await connection();
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Refresh user state from database
    const users = await query<any[]>(
      `SELECT u.id, u.company_id, u.employee_code, u.name, u.email, u.role, u.department, u.title, u.phone, u.status, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = ?
       LIMIT 1`,
      [session.id]
    );

    if (!users || users.length === 0 || users[0].status === 'Inactive') {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const u = users[0];
    return NextResponse.json({
      authenticated: true,
      user: {
        id: u.id,
        companyId: u.company_id,
        companyName: u.company_name,
        employeeCode: u.employee_code,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        title: u.title,
        phone: u.phone,
      },
    });
  } catch (err: any) {
    console.error('Session error:', err);
    return NextResponse.json({ authenticated: false, error: 'Database check failed' }, { status: 500 });
  }
}
