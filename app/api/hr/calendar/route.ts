import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || '2026', 10);
    const month = parseInt(searchParams.get('month') || '11', 10); // 1-based (1..12)

    const startMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endMonthStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Fetch holidays
    const holidays = await query<any[]>(`
      SELECT id, name, date, kind
      FROM holidays
      WHERE company_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `, [companyId, `${year}-01-01`, `${year}-12-31`]);

    // 2. Fetch leaves for this month
    const leaves = await query<any[]>(`
      SELECT 
        l.id,
        l.user_id,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.days_count,
        l.reason,
        l.status,
        u.name AS employee_name,
        u.employee_code,
        u.department AS dept
      FROM leave_requests l
      JOIN users u ON l.user_id = u.id
      WHERE l.company_id = ?
        AND l.start_date <= ? AND l.end_date >= ?
      ORDER BY l.start_date ASC
    `, [companyId, endMonthStr, startMonthStr]);

    // 3. Fetch WFH requests for this month
    const wfh = await query<any[]>(`
      SELECT 
        w.id,
        w.user_id,
        w.date,
        w.reason,
        w.status,
        u.name AS employee_name,
        u.employee_code,
        u.department AS dept
      FROM wfh_requests w
      JOIN users u ON w.user_id = u.id
      WHERE w.company_id = ?
        AND w.date >= ? AND w.date <= ?
      ORDER BY w.date ASC
    `, [companyId, startMonthStr, endMonthStr]);

    // 4. Fetch pending approvals (all active unhandled requests)
    const pendingLeaves = await query<any[]>(`
      SELECT 
        l.id,
        'Leave' AS kind,
        l.leave_type AS type,
        l.start_date,
        l.end_date,
        l.days_count AS days,
        l.reason,
        u.name AS who,
        u.employee_code,
        u.department AS dept
      FROM leave_requests l
      JOIN users u ON l.user_id = u.id
      WHERE l.company_id = ? AND l.status = 'Pending'
      ORDER BY l.created_at ASC
    `, [companyId]);

    const pendingWfh = await query<any[]>(`
      SELECT 
        w.id,
        'WFH' AS kind,
        'Work from home' AS type,
        w.date AS start_date,
        w.date AS end_date,
        1 AS days,
        w.reason,
        u.name AS who,
        u.employee_code,
        u.department AS dept
      FROM wfh_requests w
      JOIN users u ON w.user_id = u.id
      WHERE w.company_id = ? AND w.status = 'Pending'
      ORDER BY w.created_at ASC
    `, [companyId]);

    // 5. Fetch leave policy
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    // 6. Fetch daily attendance statistics for this month
    const attendanceStats = await query<any[]>(`
      SELECT 
        date,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN mode = 'WFH' THEN 1 ELSE 0 END) AS wfh_count
      FROM attendance
      WHERE company_id = ? AND date >= ? AND date <= ?
      GROUP BY date
    `, [companyId, startMonthStr, endMonthStr]);

    // Format dates cleanly
    const fmt = (d: any) => (d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0]);

    return NextResponse.json({
      success: true,
      year,
      month,
      holidays: holidays.map((h) => ({ id: h.id, name: h.name, date: fmt(h.date), kind: h.kind })),
      attendanceStats: attendanceStats.map((s) => ({
        date: fmt(s.date),
        present: Number(s.present_count || 0),
        late: Number(s.late_count || 0),
        wfh: Number(s.wfh_count || 0),
      })),
      leaves: leaves.map((l) => ({
        id: l.id,
        userId: l.user_id,
        name: l.employee_name,
        code: l.employee_code,
        type: l.leave_type,
        from: fmt(l.start_date),
        to: fmt(l.end_date),
        days: Number(l.days_count),
        reason: l.reason,
        status: l.status,
      })),
      wfh: wfh.map((w) => ({
        id: w.id,
        userId: w.user_id,
        name: w.employee_name,
        code: w.employee_code,
        date: fmt(w.date),
        reason: w.reason,
        status: w.status,
      })),
      pendingApprovals: [
        ...pendingLeaves.map((l) => ({
          id: `leave-${l.id}`,
          rawId: l.id,
          kind: 'Leave',
          who: l.who,
          code: l.employee_code,
          dept: l.dept,
          type: l.type,
          dates: `${fmt(l.start_date)} - ${fmt(l.end_date)}`,
          days: Number(l.days),
          reason: l.reason,
        })),
        ...pendingWfh.map((w) => ({
          id: `wfh-${w.id}`,
          rawId: w.id,
          kind: 'WFH',
          who: w.who,
          code: w.employee_code,
          dept: w.dept,
          type: 'Work from home',
          dates: fmt(w.start_date),
          days: 1,
          reason: w.reason,
        })),
      ],
      policy: {
        casual: Number(policy?.casual_per_month ?? 1.0),
        sick: Number(policy?.sick_per_month ?? 1.0),
        paid: Number(policy?.paid_per_year ?? 12),
        workingDays: Number(policy?.working_days_per_month ?? 22),
      },
    });
  } catch (error: any) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
