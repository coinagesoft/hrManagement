import { NextResponse, connection } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const role = searchParams.get('role') || 'All';
    const companyId = searchParams.get('companyId');

    let sql = `
      SELECT u.id, u.company_id, u.employee_code, u.name, u.email, u.role, u.department, u.title, u.phone, u.status, u.joined_date, u.created_at,
             c.name AS company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (role && role !== 'All') {
      sql += ` AND u.role = ?`;
      params.push(role);
    }

    if (companyId) {
      sql += ` AND u.company_id = ?`;
      params.push(Number(companyId));
    }

    sql += ` ORDER BY u.created_at DESC LIMIT 100`;

    const rows = await query<any[]>(sql, params);

    const users = rows.map((u) => ({
      id: u.id,
      code: u.employee_code || `EMP-${u.id}`,
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company_name || 'System / Platform',
      companyId: u.company_id,
      department: u.department || '-',
      title: u.title || '-',
      phone: u.phone || '-',
      status: u.status,
      joined: u.joined_date ? new Date(u.joined_date).toISOString().split('T')[0] : null,
    }));

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Super users list error:', error);
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, status, role, department, title } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (status && ['Active', 'Inactive'].includes(status)) {
      updates.push('status = ?');
      values.push(status);
    }

    if (role && ['admin', 'hr', 'employee'].includes(role)) {
      updates.push('role = ?');
      values.push(role);
    }

    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid update fields' }, { status: 400 });
    }

    values.push(Number(userId));
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Super update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
