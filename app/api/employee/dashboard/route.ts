import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getClientIp, verifyOfficeNetwork } from '@/lib/ip';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let userId: number = session?.id || 4;
    let companyId: number = session?.companyId || 1;

    // Fallback demo employee if unauthenticated
    if (!session?.id || !session?.companyId) {
      const [defaultEmp] = await query<any[]>(
        "SELECT id, company_id FROM users WHERE role = 'employee' ORDER BY id ASC LIMIT 1"
      );
      if (defaultEmp) {
        userId = defaultEmp.id;
        companyId = defaultEmp.company_id;
      }
    }

    // 1. Employee Profile
    const [user] = await query<any[]>(`
      SELECT u.id, u.employee_code, u.name, u.email, u.department, u.title, c.name AS company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ? AND u.company_id = ?
      LIMIT 1
    `, [userId, companyId]);

    // 2. Network and Office IP Verification
    const clientIp = getClientIp(req);
    const networkVerification = await verifyOfficeNetwork(companyId, userId, clientIp);

    // 3. Today's Attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const [todayAtt] = await query<any[]>(`
      SELECT check_in, check_out, mode, status, ip_address
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date = ?
      LIMIT 1
    `, [companyId, userId, todayStr]);

    const checkedIn = Boolean(todayAtt?.check_in);
    const checkedOut = Boolean(todayAtt?.check_out);

    // 4. Current Month Attendance Summary (November 2026)
    const [monthStats] = await query<any[]>(`
      SELECT 
        COUNT(*) AS total_recorded,
        COALESCE(SUM(CASE WHEN status = 'Present' OR status = 'Late' THEN 1 ELSE 0 END), 0) AS present_count,
        COALESCE(SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END), 0) AS late_count,
        COALESCE(SUM(CASE WHEN status = 'On leave' THEN 1 ELSE 0 END), 0) AS leave_count
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date >= '2026-11-01' AND date <= '2026-11-30'
    `, [companyId, userId]);

    // 5. Leave Balances
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const casualPerMo = Number(policy?.casual_per_month ?? 1.0);
    const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
    const paidPerYr = Number(policy?.paid_per_year ?? 12);

    // Credited through November (11 months)
    const casualCredited = Math.round(casualPerMo * 11 * 10) / 10;
    const sickCredited = Math.round(sickPerMo * 11 * 10) / 10;
    const paidCredited = paidPerYr;

    // Used approved leaves
    const usedLeaves = await query<any[]>(`
      SELECT leave_type, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved'
      GROUP BY leave_type
    `, [companyId, userId]);

    const usedMap: Record<string, number> = { Casual: 0, Sick: 0, Paid: 0 };
    usedLeaves.forEach((r) => {
      usedMap[r.leave_type] = Number(r.used_days);
    });

    const leaveBalance = {
      casual: {
        credited: casualCredited,
        used: usedMap.Casual || 0,
        left: Math.max(0, casualCredited - (usedMap.Casual || 0)),
      },
      sick: {
        credited: sickCredited,
        used: usedMap.Sick || 0,
        left: Math.max(0, sickCredited - (usedMap.Sick || 0)),
      },
      paid: {
        credited: paidCredited,
        used: usedMap.Paid || 0,
        left: Math.max(0, paidCredited - (usedMap.Paid || 0)),
      },
    };

    // 6. Latest Payslip
    const [latestPayslip] = await query<any[]>(`
      SELECT pi.net, pr.month, pr.paid_on
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      WHERE pr.company_id = ? AND pi.user_id = ? AND pr.status = 'Paid'
      ORDER BY pr.paid_on DESC, pr.id DESC
      LIMIT 1
    `, [companyId, userId]);

    // 7. Pending Documents Count (Requested by HR)
    const [pendingDocs] = await query<any[]>(`
      SELECT COUNT(*) AS c
      FROM documents
      WHERE company_id = ? AND user_id = ? AND status = 'Requested'
    `, [companyId, userId]);

    // 8. Upcoming Holidays
    const holidays = await query<any[]>(`
      SELECT id, name, date, kind
      FROM holidays
      WHERE (company_id = ? OR company_id IS NULL) AND date >= ?
      ORDER BY date ASC
      LIMIT 4
    `, [companyId, todayStr]);

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id || userId,
        code: user?.employee_code || 'ACM-014',
        name: user?.name || 'Rohan Patil',
        email: user?.email || 'rohan@acme.com',
        dept: user?.department || 'Engineering',
        title: user?.title || 'Senior Engineer',
        companyName: user?.company_name || 'Acme Technologies',
      },
      today: {
        date: todayStr,
        checkedIn,
        checkInTime: todayAtt?.check_in ? String(todayAtt.check_in).slice(0, 5) : null,
        checkedOut,
        checkOutTime: todayAtt?.check_out ? String(todayAtt.check_out).slice(0, 5) : null,
        mode: todayAtt?.mode || (networkVerification.mode === 'WFH' ? 'WFH' : 'Office'),
        status: todayAtt?.status || (checkedIn ? 'Present' : 'Not checked in'),
        clientIp,
        verification: networkVerification,
        officeIp: todayAtt?.ip_address || clientIp,
      },
      monthSummary: {
        presentCount: Number(monthStats?.present_count || 0),
        totalRecorded: Number(monthStats?.total_recorded || 0),
        lateCount: Number(monthStats?.late_count || 0),
        leaveCount: Number(monthStats?.leave_count || 0),
      },
      leaveBalance,
      latestPayslip: latestPayslip ? {
        month: latestPayslip.month,
        net: Number(latestPayslip.net),
        paidOn: latestPayslip.paid_on instanceof Date ? latestPayslip.paid_on.toISOString().split('T')[0] : String(latestPayslip.paid_on).split('T')[0],
      } : null,
      pendingDocsCount: Number(pendingDocs?.c || 0),
      upcomingHolidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date).split('T')[0],
        kind: h.kind,
      })),
    });
  } catch (error: any) {
    console.error('Employee dashboard GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
