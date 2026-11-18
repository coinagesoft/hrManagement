import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const rows = await query<any[]>(`
      SELECT u.id AS user_id, u.employee_code, u.name, u.department AS dept, u.title,
             COALESCE(a.status, 'Absent') AS status,
             COALESCE(a.mode, '-') AS mode,
             a.check_in AS \`in\`,
             a.check_out AS \`out\`,
             COALESCE(a.ip_address, '-') AS ip
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
      WHERE u.company_id = ? AND u.status = 'Active'
      ORDER BY u.name ASC
    `, [date, companyId]);

    const roster = rows.map((r) => ({
      userId: r.user_id,
      code: r.employee_code,
      name: r.name,
      dept: r.dept,
      title: r.title,
      status: r.status,
      mode: r.mode,
      in: r.in ? String(r.in).slice(0, 5) : '-',
      out: r.out ? String(r.out).slice(0, 5) : '-',
      ip: r.ip,
    }));

    return NextResponse.json({ success: true, date, roster });
  } catch (error: any) {
    console.error('Attendance fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const session = await getSessionUser();
    const body = await request.json();
    const { userId, date, checkIn, checkOut, mode, status, notes } = body;

    if (!userId || !date) {
      return NextResponse.json({ error: 'User ID and date are required.' }, { status: 400 });
    }

    const inTime = checkIn ? (checkIn.length === 5 ? `${checkIn}:00` : checkIn) : null;
    const outTime = checkOut ? (checkOut.length === 5 ? `${checkOut}:00` : checkOut) : null;

    await query(`
      INSERT INTO attendance (company_id, user_id, date, check_in, check_out, mode, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        check_in = VALUES(check_in),
        check_out = VALUES(check_out),
        mode = VALUES(mode),
        status = VALUES(status),
        notes = VALUES(notes),
        updated_at = NOW()
    `, [companyId, userId, date, inTime, outTime, mode || 'Office', status || 'Present', notes || null]);

    // Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, 'Attendance corrected', 'amber', ?, NOW())`,
      [companyId, session?.name || 'Administrator', `Attendance updated for user ${userId} on ${date}`]
    );

    return NextResponse.json({ success: true, message: 'Attendance record updated.' });
  } catch (error: any) {
    console.error('Attendance update error:', error);
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
  }
}
