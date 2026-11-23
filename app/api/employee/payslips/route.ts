import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

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
    const userId = session.id;
    const companyId = session.companyId;

    // 1. Fetch user & company details
    const [user] = await query<any[]>(`
      SELECT u.id, u.employee_code, u.name, u.department, u.title, c.name AS company_name
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.id = ? AND u.company_id = ?
      LIMIT 1
    `, [userId, companyId]);

    // 2. Fetch employee salary structure
    const [salaryStruct] = await query<any[]>(
      'SELECT in_hand_salary, components, basic, hra, other, fixed FROM salary_structures WHERE user_id = ? AND company_id = ? LIMIT 1',
      [userId, companyId]
    );

    let components: any[] = [];
    if (salaryStruct?.components) {
      try {
        components = typeof salaryStruct.components === 'string' ? JSON.parse(salaryStruct.components) : salaryStruct.components;
      } catch {
        components = [];
      }
    }
    if (!components || components.length === 0) {
      const b = Number(salaryStruct?.basic) || 15000;
      const h = Number(salaryStruct?.hra) || 5000;
      const o = Number(salaryStruct?.other) || 5000;
      components = [
        { name: 'Base Salary', type: 'earning', amount: b },
        { name: 'Allowance', type: 'earning', amount: o },
        { name: 'Accommodation', type: 'earning', amount: h },
      ];
    }

    const totalEarnings = components
      .filter((c) => c.type === 'earning')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalComponentDeductions = components
      .filter((c) => c.type === 'deduction')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const inHandSalary = Number(salaryStruct?.in_hand_salary) > 0
      ? Number(salaryStruct.in_hand_salary)
      : Math.max(0, totalEarnings - totalComponentDeductions);

    // 3. Fetch leave policy
    const [policy] = await query<any[]>(
      'SELECT casual_per_month, sick_per_month, carry_forward_enabled, per_leave_deduction_amount, salary_cycle_date FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const casualPerMo = Number(policy?.casual_per_month ?? 1.5);
    const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
    const carryForwardEnabled = Boolean(policy?.carry_forward_enabled ?? 1);
    const defaultPerLeaveRate = Number(policy?.per_leave_deduction_amount ?? 1000.00);

    // 4. Fetch all payslip requests for this user
    const slipRequests = await query<any[]>(
      'SELECT * FROM payslip_requests WHERE user_id = ? AND company_id = ? ORDER BY id DESC',
      [userId, companyId]
    );
    const slipRequestMap = new Map<string, any>();
    for (const sr of slipRequests) {
      slipRequestMap.set(sr.month, sr);
    }

    // 5. Fetch all payroll runs for company
    const runs = await query<any[]>(
      'SELECT * FROM payroll_runs WHERE company_id = ? ORDER BY id DESC',
      [companyId]
    );
    const runMap = new Map<string, any>();
    for (const r of runs) {
      runMap.set(r.month, r);
    }

    // Standard available months
    const allMonths = [
      'November 2026',
      'October 2026',
      'September 2026',
      'August 2026',
      'July 2026',
    ];

    // Query user leaves in 2026
    const leaveHistoryRows = await query<any[]>(`
      SELECT leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved' AND YEAR(start_date) = 2026
      GROUP BY leave_type, MONTH(start_date)
    `, [companyId, userId]);

    const payslips = allMonths.map((m, index) => {
      const run = runMap.get(m);
      const request = slipRequestMap.get(m);
      const isPaid = run?.status === 'Paid';
      const perLeaveRate = Number(run?.per_leave_deduction_amount ?? defaultPerLeaveRate);

      // Determine month number
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthPart = m.split(' ')[0];
      const monthNum = mNames.indexOf(monthPart) + 1;
      const priorMonthsCount = Math.max(0, monthNum - 1);
      const monthlyCreditTotal = casualPerMo + sickPerMo;

      // Carry forward
      const priorUsed = leaveHistoryRows
        .filter((r) => r.m < monthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);
      const totalPriorCredited = priorMonthsCount * monthlyCreditTotal;
      const carryForwardLeaves = carryForwardEnabled ? Math.max(0, totalPriorCredited - priorUsed) : 0;
      const availableLeaves = carryForwardLeaves + monthlyCreditTotal;

      const currentMonthUsed = leaveHistoryRows
        .filter((r) => r.m === monthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);
      const excessLeaves = Math.max(0, currentMonthUsed - availableLeaves);
      const leaveDeduction = excessLeaves * perLeaveRate;
      const netSalary = Math.max(0, inHandSalary - leaveDeduction);

      const requestStatus = request ? request.status : 'Not Requested';
      const isRaised = requestStatus === 'Raised';

      return {
        id: request?.id || index + 1,
        month: m,
        paidOn: run?.paid_on ? String(run.paid_on).split('T')[0] : (isPaid ? '2026-11-01' : null),
        status: run?.status || 'Draft',
        slipStatus: requestStatus, // 'Not Requested' | 'Requested' | 'Raised'
        isRaised,
        requestedAt: request?.requested_at || null,
        raisedAt: request?.raised_at || null,
        employeeName: user?.name || 'Employee',
        employeeCode: user?.employee_code || 'EMP',
        title: user?.title || 'Team Member',
        department: user?.department || 'General',
        companyName: user?.company_name || 'Acme Technologies',
        inHandSalary,
        components,
        totalEarnings,
        totalComponentDeductions,
        availableLeaves,
        carryForwardLeaves,
        currentMonthCredited: monthlyCreditTotal,
        leavesTaken: currentMonthUsed,
        excessLeaves,
        perLeaveRate,
        leaveDeduction,
        net: netSalary,
        fileName: request?.file_name || null,
        fileUrl: request?.file_url || null,
        fileSize: request?.file_size || null,
        fileType: request?.file_type || null,
        notes: request?.notes || null,
      };
    });

    return NextResponse.json({ success: true, payslips });
  } catch (error: any) {
    console.error('Employee payslips GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    if (!session?.id || !session?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is missing or invalid', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const userId = session.id;
    const companyId = session.companyId;

    const body = await req.json();
    const { action, month } = body;

    if (action !== 'request_slip' || !month) {
      return NextResponse.json({ success: false, error: 'Valid action and month are required' }, { status: 400 });
    }

    // Check if already requested or raised
    const existing = await query<any[]>(
      'SELECT id, status FROM payslip_requests WHERE user_id = ? AND company_id = ? AND month = ? LIMIT 1',
      [userId, companyId, month]
    );

    if (existing && existing.length > 0) {
      if (existing[0].status === 'Raised') {
        return NextResponse.json({
          success: true,
          message: `Salary slip for ${month} has already been raised and is ready to view.`,
          status: 'Raised',
        });
      }
      return NextResponse.json({
        success: true,
        message: `Salary slip for ${month} is already requested. Waiting for Admin/HR to raise slip.`,
        status: existing[0].status,
      });
    }

    await query(`
      INSERT INTO payslip_requests (company_id, user_id, month, status, requested_at)
      VALUES (?, ?, ?, 'Requested', NOW())
    `, [companyId, userId, month]);

    const userName = session.name || 'Employee';
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Payslip requested', 'blue', ?, NOW())`,
      [companyId, userId, userName, `${userName} requested salary slip for ${month}`]
    );

    return NextResponse.json({
      success: true,
      message: `Salary slip requested for ${month}. Admin/HR will raise your slip shortly.`,
      status: 'Requested',
    });
  } catch (error: any) {
    console.error('Employee payslip POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
