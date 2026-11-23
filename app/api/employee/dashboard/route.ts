import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getClientIp, verifyOfficeNetwork } from '@/lib/ip';
import { calculateAttendanceHoursSummary, calculateRecordHours } from '@/lib/hours';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    if (!session?.id || !session?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is missing or invalid', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const userId: number = session.id;
    const companyId: number = session.companyId;

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

    // 3. Today's Attendance in IST
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    const [todayAtt] = await query<any[]>(`
      SELECT check_in, check_out, mode, status, ip_address
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date = ?
      LIMIT 1
    `, [companyId, userId, todayStr]);

    const checkedIn = Boolean(todayAtt?.check_in);
    const checkedOut = Boolean(todayAtt?.check_out);

    // 4. Current Month Attendance Records for Hours Calculation
    const currentMonthPrefix = todayStr.slice(0, 7); // e.g. "2026-11"
    const monthRows = await query<any[]>(`
      SELECT id, date, check_in, check_out, mode, status
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `, [companyId, userId, `${currentMonthPrefix}-01`, `${currentMonthPrefix}-31`]);

    const hoursSummary = calculateAttendanceHoursSummary(
      monthRows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
        checkIn: r.check_in ? String(r.check_in).slice(0, 5) : null,
        checkOut: r.check_out ? String(r.check_out).slice(0, 5) : null,
        status: r.status,
      })),
      todayStr
    );

    // Month summary counts
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    monthRows.forEach((r) => {
      if (r.status === 'Present') presentCount++;
      else if (r.status === 'Late') lateCount++;
      else if (r.status === 'On leave') leaveCount++;
    });

    // 5. Leave Policy & Dynamic Carry Forward Calculation
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const casualPerMo = Number(policy?.casual_per_month ?? 1.5);
    const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
    const carryForwardEnabled = Boolean(policy?.carry_forward_enabled ?? 1);

    const currentMonthNum = parseInt(todayStr.slice(5, 7), 10);
    const currentYearNum = parseInt(todayStr.slice(0, 4), 10);
    const priorMonthsCount = Math.max(0, currentMonthNum - 1);

    // Used approved leaves this year
    const usedLeavesRows = await query<any[]>(`
      SELECT leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved' AND YEAR(start_date) = ?
      GROUP BY leave_type, MONTH(start_date)
    `, [companyId, userId, currentYearNum]);

    function computeLeave(type: string, rate: number) {
      const priorUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === type.toLowerCase() && r.m < currentMonthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      const currentUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === type.toLowerCase() && r.m === currentMonthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      const totalUsedYtd = priorUsed + currentUsed;

      let carriedForward = 0;
      if (carryForwardEnabled && priorMonthsCount > 0) {
        const priorAccrued = Math.round(priorMonthsCount * rate * 10) / 10;
        carriedForward = Math.max(0, Math.round((priorAccrued - priorUsed) * 10) / 10);
      }

      const totalAvailable = Math.max(0, Math.round((carriedForward + rate - currentUsed) * 10) / 10);
      const totalCredited = Math.round((carriedForward + rate + priorUsed) * 10) / 10;

      return {
        credited: totalCredited,
        perMonth: rate,
        carriedForward,
        currentMonthAccrual: rate,
        used: totalUsedYtd,
        left: totalAvailable,
        carryForwardEnabled,
        formula: carryForwardEnabled
          ? `${carriedForward.toFixed(1)} carried + ${rate.toFixed(1)} this mo`
          : `${rate.toFixed(1)}/mo`,
      };
    }

    const leaveBalance = {
      casual: computeLeave('Casual', casualPerMo),
      sick: computeLeave('Sick', sickPerMo),
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

    // 9. Company Schedule Settings
    const [settings] = await query<any[]>(
      'SELECT start_time, end_time, late_cutoff_time, working_days FROM company_settings WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    // 10. Recently Rejected Requests (within last 7 days)
    const recentRejections = await query<any[]>(`
      (SELECT 'leave' AS kind, leave_type AS type, start_date AS \`from\`, end_date AS \`to\`, days_count AS days, reason, rejection_reason, decided_at
       FROM leave_requests
       WHERE company_id = ? AND user_id = ? AND status = 'Rejected' AND decided_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
      UNION ALL
      (SELECT 'wfh' AS kind, 'Work from home' AS type, date AS \`from\`, date AS \`to\`, 1 AS days, reason, rejection_reason, decided_at
       FROM wfh_requests
       WHERE company_id = ? AND user_id = ? AND status = 'Rejected' AND decided_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
      ORDER BY decided_at DESC
      LIMIT 3
    `, [companyId, userId, companyId, userId]);

    // Salary Cycle & Payment Status for November 2026
    const currentMonthName = 'November 2026';
    const [empPayrollRun] = await query<any[]>(
      'SELECT status, paid_on, cycle_date FROM payroll_runs WHERE company_id = ? AND month = ? LIMIT 1',
      [companyId, currentMonthName]
    );

    const isEmpSalaryPaid = empPayrollRun?.status === 'Paid';
    const salaryStatus = {
      month: currentMonthName,
      cycleDate: Number(empPayrollRun?.cycle_date || 1),
      isPaid: isEmpSalaryPaid,
      paidOn: empPayrollRun?.paid_on ? String(empPayrollRun.paid_on).split('T')[0] : null,
      pending: !isEmpSalaryPaid,
      message: !isEmpSalaryPaid
        ? `Salary payout for ${currentMonthName} is currently pending disbursement by HR/Admin (Salary cycle: 1st of the month).`
        : `Salary for ${currentMonthName} has been paid on ${empPayrollRun?.paid_on ? String(empPayrollRun.paid_on).split('T')[0] : '1st of the month'}.`,
    };

    return NextResponse.json({
      success: true,
      salaryStatus,
      user: {
        id: user?.id || userId,
        code: user?.employee_code || 'ACM-014',
        name: user?.name || 'Rohan Patil',
        email: user?.email || 'rohan@acme.com',
        dept: user?.department || 'Engineering',
        title: user?.title || 'Senior Engineer',
        companyName: user?.company_name || 'Acme Technologies',
      },
      schedule: {
        startTime: settings?.start_time ? String(settings.start_time).slice(0, 5) : '09:00',
        endTime: settings?.end_time ? String(settings.end_time).slice(0, 5) : '18:00',
        lateCutoff: settings?.late_cutoff_time ? String(settings.late_cutoff_time).slice(0, 5) : '09:15',
        workingDays: settings?.working_days || '1,2,3,4,5',
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
      hoursSummary,
      monthSummary: {
        presentCount,
        totalRecorded: monthRows.length,
        lateCount,
        leaveCount,
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
      recentRejections: recentRejections.map((r) => {
        const fromStr = r.from instanceof Date ? r.from.toISOString().split('T')[0] : String(r.from).split('T')[0];
        const toStr = r.to instanceof Date ? r.to.toISOString().split('T')[0] : String(r.to).split('T')[0];
        const rej = r.rejection_reason || (r.reason?.includes('[Rejection Reason:') ? r.reason.split('[Rejection Reason:')[1]?.replace(/\]$/, '').trim() : null);
        return {
          kind: r.kind,
          type: r.type,
          period: fromStr === toStr ? fromStr : `${fromStr} to ${toStr}`,
          days: r.days,
          reason: r.reason,
          rejectionReason: rej,
          decidedAt: r.decided_at,
        };
      }),
    });
  } catch (error: any) {
    console.error('Employee dashboard GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
