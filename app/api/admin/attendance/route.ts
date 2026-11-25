import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { calculateRecordHours } from '@/lib/hours';

async function resolveCompanyId(request?: Request): Promise<number> {
  if (request) {
    const headerCompanyId = request.headers.get('x-company-id');
    if (headerCompanyId) {
      const parsed = parseInt(headerCompanyId, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  const session = await getSessionUser(request);
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId(request);
    const { searchParams } = new URL(request.url);
    const monthQuery = searchParams.get('month');
    const isExport = searchParams.get('export') === 'true';

    // If month query or export requested, return full month attendance
    if (isExport || monthQuery) {
      let year = 2026;
      let monthNum = 11;
      if (monthQuery && monthQuery.includes(' ')) {
        const parts = monthQuery.split(' ');
        const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const idx = mNames.indexOf(parts[0]);
        if (idx !== -1) monthNum = idx + 1;
        year = parseInt(parts[1], 10) || 2026;
      } else if (searchParams.get('year') && searchParams.get('monthNum')) {
        year = parseInt(searchParams.get('year') || '2026', 10);
        monthNum = parseInt(searchParams.get('monthNum') || '11', 10);
      }

      const startMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const monthRows = await query<any[]>(`
        SELECT 
          a.date,
          u.employee_code,
          u.name,
          u.department AS dept,
          u.title,
          COALESCE(a.check_in, '-') AS check_in,
          COALESCE(a.check_out, '-') AS check_out,
          COALESCE(a.mode, '-') AS mode,
          COALESCE(a.status, 'Present') AS status,
          COALESCE(a.ip_address, '-') AS ip,
          a.notes
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE u.company_id = ?
          AND a.date >= ? AND a.date <= ?
        ORDER BY a.date DESC, u.name ASC
      `, [companyId, startMonthStr, endMonthStr]);

      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

      const records = monthRows.map((r) => {
        const inStr = r.check_in ? String(r.check_in).slice(0, 5) : '-';
        const outStr = r.check_out ? String(r.check_out).slice(0, 5) : '-';
        const dStr = new Date(r.date).toISOString().split('T')[0];
        const dur = calculateRecordHours(inStr, outStr, dStr, todayStr);
        return {
          date: dStr,
          employeeCode: r.employee_code || '-',
          name: r.name,
          dept: r.dept || 'Engineering',
          title: r.title || 'Team Member',
          checkIn: inStr,
          checkOut: outStr,
          hoursFormatted: dur.formatted,
          hoursDecimal: dur.hours,
          mode: r.mode || 'Office',
          status: r.status || 'Present',
          ip: r.ip || '-',
          notes: r.notes || '',
        };
      });

      return NextResponse.json({
        success: true,
        year,
        month: monthNum,
        startMonthStr,
        endMonthStr,
        records,
      });
    }

    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const rows = await query<any[]>(`
      SELECT u.id AS user_id, u.employee_code, u.name, u.department AS dept, u.title,
             CASE
               WHEN a.status IS NOT NULL THEN a.status
               WHEN lr.id IS NOT NULL THEN 'On leave'
               ELSE 'Absent'
             END AS status,
             CASE
               WHEN a.mode IS NOT NULL AND a.mode != '' AND a.mode != '-' THEN a.mode
               WHEN wr.id IS NOT NULL THEN 'WFH'
               WHEN lr.id IS NOT NULL THEN lr.leave_type
               ELSE '-'
             END AS mode,
             a.check_in AS \`in\`,
             a.check_out AS \`out\`,
             COALESCE(a.ip_address, '-') AS ip,
             lr.reason AS leave_reason,
             lr.leave_type
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
      LEFT JOIN leave_requests lr ON lr.user_id = u.id AND lr.status = 'Approved' AND ? BETWEEN lr.start_date AND lr.end_date
      LEFT JOIN wfh_requests wr ON wr.user_id = u.id AND wr.status = 'Approved' AND wr.date = ?
      WHERE u.company_id = ? AND u.role != 'super'
        AND (
          (u.status = 'Active' AND u.deactivation_date IS NULL)
          OR (u.deactivation_date IS NOT NULL AND ? <= u.deactivation_date)
        )
      ORDER BY u.name ASC
    `, [date, date, date, companyId, date]);

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const roster = rows.map((r) => {
      const inStr = r.in ? String(r.in).slice(0, 5) : '-';
      const outStr = r.out ? String(r.out).slice(0, 5) : '-';
      const dur = calculateRecordHours(inStr, outStr, date, todayStr);
      return {
        userId: r.user_id,
        code: r.employee_code,
        name: r.name,
        dept: r.dept,
        title: r.title,
        status: r.status,
        mode: r.mode,
        in: inStr,
        out: outStr,
        hoursFormatted: dur.formatted,
        hoursDecimal: dur.hours,
        ip: r.ip,
        leaveReason: r.leave_reason || null,
        leaveType: r.leave_type || null,
      };
    });

    const counts = {
      total: roster.length,
      present: roster.filter((r) => r.status === 'Present').length,
      late: roster.filter((r) => r.status === 'Late').length,
      onLeave: roster.filter((r) => r.status === 'On leave').length,
      wfh: roster.filter((r) => r.mode === 'WFH').length,
      absent: roster.filter((r) => r.status === 'Absent').length,
    };

    return NextResponse.json({ success: true, date, roster, counts });
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
