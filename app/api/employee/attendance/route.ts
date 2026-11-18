import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let userId = session?.id;
    let companyId = session?.companyId;

    if (!userId || !companyId) {
      const [defaultEmp] = await query<any[]>(
        "SELECT id, company_id FROM users WHERE role = 'employee' ORDER BY id ASC LIMIT 1"
      );
      userId = defaultEmp?.id || 4;
      companyId = defaultEmp?.company_id || 1;
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || 'November 2026';

    let year = 2026;
    let monthNum = 11;
    const parts = month.split(' ');
    if (parts.length === 2) {
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = mNames.indexOf(parts[0]);
      if (idx !== -1) monthNum = idx + 1;
      year = parseInt(parts[1], 10) || 2026;
    }

    const startStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await query<any[]>(`
      SELECT id, date, check_in, check_out, mode, status, ip_address, notes
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `, [companyId, userId, startStr, endStr]);

    let present = 0;
    let late = 0;
    let halfDays = 0;
    let onLeave = 0;

    const records = rows.map((r) => {
      const checkInStr = r.check_in ? String(r.check_in).slice(0, 5) : '—';
      const checkOutStr = r.check_out ? String(r.check_out).slice(0, 5) : '—';
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];

      if (r.status === 'Present') present++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'On leave') onLeave++;

      return {
        id: r.id,
        date: dateStr,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        mode: r.mode || 'Office',
        status: r.status,
      };
    });

    return NextResponse.json({
      success: true,
      month,
      summary: {
        present,
        late,
        halfDays,
        onLeave,
      },
      records,
    });
  } catch (error: any) {
    console.error('Employee attendance GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let userId = session?.id;
    let companyId = session?.companyId;

    if (!userId || !companyId) {
      const [defaultEmp] = await query<any[]>(
        "SELECT id, company_id FROM users WHERE role = 'employee' ORDER BY id ASC LIMIT 1"
      );
      userId = defaultEmp?.id || 4;
      companyId = defaultEmp?.company_id || 1;
    }

    const body = await req.json();
    const { action, mode = 'Office' } = body;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0]; // 'HH:mm:ss'

    // Check if late (e.g. after 09:30 AM)
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
    const initialStatus = isLate ? 'Late' : 'Present';

    if (action === 'check_in') {
      await query(`
        INSERT INTO attendance (company_id, user_id, date, check_in, mode, status, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, '203.0.113.24')
        ON DUPLICATE KEY UPDATE
          check_in = COALESCE(check_in, VALUES(check_in)),
          mode = VALUES(mode),
          status = IF(status = 'Present' OR status = 'Late', status, VALUES(status))
      `, [companyId, userId, todayStr, timeStr, mode, initialStatus]);

      return NextResponse.json({
        success: true,
        message: `Checked in at ${timeStr.slice(0, 5)} (${mode})`,
        checkInTime: timeStr.slice(0, 5),
        status: initialStatus,
      });
    }

    if (action === 'check_out') {
      await query(`
        INSERT INTO attendance (company_id, user_id, date, check_out, mode, status, ip_address)
        VALUES (?, ?, ?, ?, ?, 'Present', '203.0.113.24')
        ON DUPLICATE KEY UPDATE
          check_out = VALUES(check_out)
      `, [companyId, userId, todayStr, timeStr, mode]);

      return NextResponse.json({
        success: true,
        message: `Checked out at ${timeStr.slice(0, 5)}`,
        checkOutTime: timeStr.slice(0, 5),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid attendance action' }, { status: 400 });
  } catch (error: any) {
    console.error('Employee attendance POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
