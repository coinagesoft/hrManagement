import { NextResponse, connection } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const dept = searchParams.get('dept') || 'All';
    const status = searchParams.get('status') || 'All';

    let sql = `
      SELECT id, company_id, employee_code, name, email, phone, role, department, title, status, joined_date, created_at
      FROM users
      WHERE company_id = ?
    `;
    const params: any[] = [companyId];

    if (q) {
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(employee_code, '')) LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (dept && dept !== 'All') {
      sql += ` AND department = ?`;
      params.push(dept);
    }

    if (status && status !== 'All') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY id ASC`;

    const rows = await query<any[]>(sql, params);

    const employees = rows.map((u) => ({
      id: String(u.id),
      code: u.employee_code || `EMP-${String(u.id).padStart(3, '0')}`,
      name: u.name,
      email: u.email,
      phone: u.phone || '-',
      dept: u.department || 'General',
      title: u.title || (u.role === 'admin' ? 'Administrator' : u.role === 'hr' ? 'HR Manager' : 'Team Member'),
      role: (u.role || 'employee').toUpperCase() as 'ADMIN' | 'HR' | 'EMPLOYEE',
      status: u.status as 'Active' | 'Inactive',
      joined: u.joined_date ? new Date(u.joined_date).toISOString().split('T')[0] : '2026-01-01',
    }));

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error('Admin employees list error:', error);
    return NextResponse.json({ error: 'Failed to retrieve employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { name, email, phone, dept, title, role, joined } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanRole = (role || 'employee').toLowerCase();

    // Check duplicate email
    const existing = await query<any[]>('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 409 });
    }

    // Get company code for employee ID
    const [comp] = await query<any[]>('SELECT code FROM companies WHERE id = ?', [companyId]);
    const codePrefix = comp?.code || 'EMP';

    const [countRows] = await query<any[]>('SELECT COUNT(*) as cnt FROM users WHERE company_id = ?', [companyId]);
    const empCode = `${codePrefix}-${String((countRows[0]?.cnt || 0) + 1).padStart(3, '0')}`;

    const defaultPw = await hashPassword('Password123!');

    const insertRes = await query<any>(
      `INSERT INTO users 
       (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
      [
        companyId,
        empCode,
        cleanName,
        cleanEmail,
        defaultPw,
        cleanRole,
        dept || 'Engineering',
        title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
        phone || null,
        joined || new Date().toISOString().split('T')[0],
      ]
    );

    const newId = insertRes.insertId;

    return NextResponse.json({
      success: true,
      employee: {
        id: String(newId),
        code: empCode,
        name: cleanName,
        email: cleanEmail,
        phone: phone || '-',
        dept: dept || 'Engineering',
        title: title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
        role: cleanRole.toUpperCase(),
        status: 'Active',
        joined: joined || new Date().toISOString().split('T')[0],
      },
      message: `${cleanRole === 'hr' ? 'HR user' : 'Employee'} added successfully.`,
    });
  } catch (error: any) {
    console.error('Admin add employee error:', error);
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { id, name, email, phone, dept, title, role, status, joined } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name.trim()); }
    if (email) { updates.push('email = ?'); values.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (dept) { updates.push('department = ?'); values.push(dept); }
    if (title) { updates.push('title = ?'); values.push(title); }
    if (role) { updates.push('role = ?'); values.push(role.toLowerCase()); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (joined) { updates.push('joined_date = ?'); values.push(joined); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    values.push(Number(id), companyId);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND company_id = ?`, values);

    return NextResponse.json({ success: true, message: 'Employee updated successfully.' });
  } catch (error: any) {
    console.error('Admin update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    // Soft deactivate instead of hard delete
    await query(
      "UPDATE users SET status = 'Inactive', updated_at = NOW() WHERE id = ? AND company_id = ?",
      [Number(id), companyId]
    );

    return NextResponse.json({ success: true, message: 'Employee deactivated successfully.' });
  } catch (error: any) {
    console.error('Admin deactivate employee error:', error);
    return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 });
  }
}
