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
    const month = searchParams.get('month') || 'November 2026';

    // 1. Fetch current payroll run for this month if exists
    const [runRows] = await query<any[]>(
      'SELECT * FROM payroll_runs WHERE company_id = ? AND month = ? LIMIT 1',
      [companyId, month]
    );

    // 2. Fetch leave policy for working days count
    const [policyRows] = await query<any[]>(
      'SELECT working_days_per_month FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const workingDays = Number(policyRows?.working_days_per_month) || 22;

    // 3. Fetch all active employees
    const employees = await query<any[]>(`
      SELECT 
        u.id, 
        u.employee_code, 
        u.name, 
        u.department, 
        u.title, 
        u.status,
        s.basic, 
        s.hra, 
        s.other, 
        s.fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = ? AND u.status = 'Active' AND u.role != 'super'
      ORDER BY u.id ASC
    `, [companyId]);

    // 4. Fetch unpaid leave days for each employee in this month
    // Determine year and month numbers for query
    let year = 2026;
    let monthNum = 11;
    const parts = month.split(' ');
    if (parts.length === 2) {
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = mNames.indexOf(parts[0]);
      if (idx !== -1) monthNum = idx + 1;
      year = parseInt(parts[1], 10) || 2026;
    }
    const startMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-31`;

    const unpaidLeaves = await query<any[]>(`
      SELECT user_id, COALESCE(SUM(days_count), 0) AS unpaid_days
      FROM leave_requests
      WHERE company_id = ? 
        AND status = 'Approved' 
        AND leave_type = 'Unpaid'
        AND start_date <= ? AND end_date >= ?
      GROUP BY user_id
    `, [companyId, endMonthStr, startMonthStr]);

    const unpaidMap = new Map<number, number>();
    for (const r of unpaidLeaves) {
      unpaidMap.set(r.user_id, Number(r.unpaid_days));
    }

    // Also count unexcused absent days in attendance for this month
    const absentAttendance = await query<any[]>(`
      SELECT user_id, COUNT(*) AS absent_days
      FROM attendance
      WHERE company_id = ? 
        AND status = 'Absent'
        AND date >= ? AND date <= ?
      GROUP BY user_id
    `, [companyId, startMonthStr, endMonthStr]);

    for (const a of absentAttendance) {
      const prev = unpaidMap.get(a.user_id) || 0;
      unpaidMap.set(a.user_id, prev + Number(a.absent_days));
    }

    // 5. Compute each employee's salary row
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalUnpaidDays = 0;

    const items = employees.map((emp) => {
      const basic = Number(emp.basic) || 40000;
      const hra = Number(emp.hra) || 18000;
      const other = Number(emp.other) || 12000;
      const fixed = Number(emp.fixed) || 2000;
      const gross = basic + hra + other;

      const unpaidDays = unpaidMap.get(emp.id) || 0;
      const perDayRate = gross / workingDays;
      const unpaidDed = Math.round(perDayRate * unpaidDays);
      const deductions = fixed + unpaidDed;
      const net = Math.max(0, gross - deductions);

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;
      totalUnpaidDays += unpaidDays;

      return {
        userId: emp.id,
        code: emp.employee_code,
        name: emp.name,
        dept: emp.department,
        title: emp.title,
        basic,
        hra,
        other,
        gross,
        fixed,
        unpaidDays,
        unpaidDed,
        deductions,
        net,
        status: runRows?.status || 'Draft',
      };
    });

    return NextResponse.json({
      success: true,
      month,
      stage: runRows?.status || 'Draft',
      paidOn: runRows?.paid_on || null,
      workingDays,
      summary: {
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: items.length,
        totalUnpaidDays,
      },
      items,
    });
  } catch (error: any) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { action, month = 'November 2026' } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    // 1. Fetch or calculate latest totals
    const [policyRows] = await query<any[]>(
      'SELECT working_days_per_month FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const workingDays = Number(policyRows?.working_days_per_month) || 22;

    const employees = await query<any[]>(`
      SELECT u.id, s.basic, s.hra, s.other, s.fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = ? AND u.status = 'Active' AND u.role != 'super'
    `, [companyId]);

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const computedItems = employees.map((emp) => {
      const basic = Number(emp.basic) || 40000;
      const hra = Number(emp.hra) || 18000;
      const other = Number(emp.other) || 12000;
      const fixed = Number(emp.fixed) || 2000;
      const gross = basic + hra + other;
      const unpaidDays = 0;
      const unpaidDed = 0;
      const deductions = fixed + unpaidDed;
      const net = Math.max(0, gross - deductions);

      totalGross += gross;
      totalDeductions += deductions;
      totalNet += net;

      return {
        userId: emp.id,
        basic,
        hra,
        other,
        gross,
        unpaidDays,
        unpaidDed,
        fixed,
        net,
      };
    });

    if (action === 'run_payroll') {
      // Upsert payroll run with Finalised status
      await query(`
        INSERT INTO payroll_runs (company_id, month, status, total_gross, total_deductions, total_net)
        VALUES (?, ?, 'Finalised', ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          status = 'Finalised',
          total_gross = VALUES(total_gross),
          total_deductions = VALUES(total_deductions),
          total_net = VALUES(total_net),
          updated_at = NOW()
      `, [companyId, month, totalGross, totalDeductions, totalNet]);

      const [run] = await query<any[]>(
        'SELECT id FROM payroll_runs WHERE company_id = ? AND month = ? LIMIT 1',
        [companyId, month]
      );

      // Replace payroll items
      if (run) {
        await query('DELETE FROM payroll_items WHERE payroll_run_id = ?', [run.id]);
        for (const item of computedItems) {
          await query(`
            INSERT INTO payroll_items (payroll_run_id, user_id, basic, hra, other, gross, unpaid_days, unpaid_deduction, fixed_deduction, net, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Finalised')
          `, [run.id, item.userId, item.basic, item.hra, item.other, item.gross, item.unpaidDays, item.unpaidDed, item.fixed, item.net]);
        }
      }

      await query(
        `INSERT INTO audit_logs (company_id, user_id, action, target_type, target_id, details)
         VALUES (?, ?, 'run_payroll', 'payroll_run', ?, ?)`,
        [companyId, session?.id || 1, run?.id || 0, `Generated payroll for ${month}`]
      );

      return NextResponse.json({
        success: true,
        message: `Payroll finalized for ${month}`,
        stage: 'Finalised',
      });
    }

    if (action === 'mark_paid') {
      const todayStr = new Date().toISOString().split('T')[0];

      await query(`
        INSERT INTO payroll_runs (company_id, month, status, total_gross, total_deductions, total_net, paid_on)
        VALUES (?, ?, 'Paid', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          status = 'Paid',
          paid_on = VALUES(paid_on),
          total_gross = VALUES(total_gross),
          total_deductions = VALUES(total_deductions),
          total_net = VALUES(total_net),
          updated_at = NOW()
      `, [companyId, month, totalGross, totalDeductions, totalNet, todayStr]);

      const [run] = await query<any[]>(
        'SELECT id FROM payroll_runs WHERE company_id = ? AND month = ? LIMIT 1',
        [companyId, month]
      );

      if (run) {
        await query("UPDATE payroll_items SET status = 'Paid' WHERE payroll_run_id = ?", [run.id]);
      }

      await query(
        `INSERT INTO audit_logs (company_id, user_id, action, target_type, target_id, details)
         VALUES (?, ?, 'mark_payroll_paid', 'payroll_run', ?, ?)`,
        [companyId, session?.id || 1, run?.id || 0, `Marked payroll as paid for ${month}`]
      );

      return NextResponse.json({
        success: true,
        message: `Payroll marked as paid for ${month}`,
        stage: 'Paid',
        paidOn: todayStr,
      });
    }

    if (action === 'reset_draft') {
      await query(`
        UPDATE payroll_runs 
        SET status = 'Draft', paid_on = NULL, updated_at = NOW()
        WHERE company_id = ? AND month = ?
      `, [companyId, month]);

      const [run] = await query<any[]>(
        'SELECT id FROM payroll_runs WHERE company_id = ? AND month = ? LIMIT 1',
        [companyId, month]
      );

      if (run) {
        await query("UPDATE payroll_items SET status = 'Draft' WHERE payroll_run_id = ?", [run.id]);
      }

      return NextResponse.json({
        success: true,
        message: `Payroll reset to draft for ${month}`,
        stage: 'Draft',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Payroll POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
