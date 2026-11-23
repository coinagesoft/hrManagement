import { NextResponse, connection } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

function saveBase64ToPayslips(fileName: string, base64Url: string): string {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payslips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const match = base64Url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return base64Url;

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${cleanName}`;
    const fullPath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/payslips/${uniqueName}`;
  } catch (err) {
    console.error('Failed to save payslip file:', err);
    return base64Url;
  }
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
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

    // 2. Fetch leave policy
    const [policyRows] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const workingDays = Number(policyRows?.working_days_per_month) || 22;
    const casualPerMo = Number(policyRows?.casual_per_month ?? 1.5);
    const sickPerMo = Number(policyRows?.sick_per_month ?? 1.0);
    const carryForwardEnabled = Boolean(policyRows?.carry_forward_enabled ?? 1);
    const perLeaveRate = Number(runRows?.per_leave_deduction_amount ?? policyRows?.per_leave_deduction_amount ?? 1000.00);
    const cycleDate = Number(policyRows?.salary_cycle_date ?? 1);

    // Parse month and year
    let year = 2026;
    let monthNum = 11;
    const parts = month.split(' ');
    if (parts.length === 2) {
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = mNames.indexOf(parts[0]);
      if (idx !== -1) monthNum = idx + 1;
      year = parseInt(parts[1], 10) || 2026;
    }

    // 3. Fetch all active employees with their salary structures
    const employees = await query<any[]>(`
      SELECT 
        u.id, 
        u.employee_code, 
        u.name, 
        u.department, 
        u.title, 
        u.status,
        s.in_hand_salary,
        s.components,
        s.basic, 
        s.hra, 
        s.other, 
        s.fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = ? AND u.status = 'Active' AND u.role != 'super'
      ORDER BY u.id ASC
    `, [companyId]);

    // 4. Leave calculations for carry forward and current month
    const leaveHistoryRows = await query<any[]>(`
      SELECT user_id, leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND status = 'Approved' AND YEAR(start_date) = ?
      GROUP BY user_id, leave_type, MONTH(start_date)
    `, [companyId, year]);

    // Absent attendance records in this month
    const startMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endMonthStr = `${year}-${String(monthNum).padStart(2, '0')}-31`;

    const absentAttendance = await query<any[]>(`
      SELECT user_id, COUNT(*) AS absent_days
      FROM attendance
      WHERE company_id = ? 
        AND status = 'Absent'
        AND date >= ? AND date <= ?
      GROUP BY user_id
    `, [companyId, startMonthStr, endMonthStr]);

    const absentMap = new Map<number, number>();
    for (const a of absentAttendance) {
      absentMap.set(a.user_id, Number(a.absent_days));
    }

    // 5. Fetch payslip requests for this month
    const payslipRequests = await query<any[]>(`
      SELECT pr.*, u.name AS employee_name, u.employee_code
      FROM payslip_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.company_id = ? AND pr.month = ?
      ORDER BY pr.id DESC
    `, [companyId, month]);

    const payslipRequestMap = new Map<number, any>();
    for (const pr of payslipRequests) {
      payslipRequestMap.set(pr.user_id, pr);
    }

    // 6. Compute each employee's salary row
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalUnpaidDays = 0;

    const priorMonthsCount = Math.max(0, monthNum - 1);
    const monthlyCreditTotal = casualPerMo + sickPerMo;

    const items = employees.map((emp) => {
      let comps: any[] = [];
      if (emp.components) {
        try {
          comps = typeof emp.components === 'string' ? JSON.parse(emp.components) : emp.components;
        } catch {
          comps = [];
        }
      }

      if (!comps || !Array.isArray(comps) || comps.length === 0) {
        const b = Number(emp.basic) || 15000;
        const h = Number(emp.hra) || 5000;
        const o = Number(emp.other) || 5000;
        const f = Number(emp.fixed) || 0;
        comps = [
          { name: 'Base Salary', type: 'earning', mode: 'amount', amount: b },
          { name: 'Allowance', type: 'earning', mode: 'amount', amount: o },
          { name: 'Accommodation', type: 'earning', mode: 'amount', amount: h },
        ];
        if (f > 0) comps.push({ name: 'Fixed Deduction', type: 'deduction', mode: 'amount', amount: f });
      }

      const totalEarnings = comps
        .filter((c) => c.type === 'earning')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalComponentDeductions = comps
        .filter((c) => c.type === 'deduction')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const baseInHand = Math.max(0, totalEarnings - totalComponentDeductions);
      const inHandSalary = Number(emp.in_hand_salary) > 0 ? Number(emp.in_hand_salary) : baseInHand;

      // Leave calculation
      const empLeaves = leaveHistoryRows.filter((r) => r.user_id === emp.id);
      const priorUsed = empLeaves
        .filter((r) => r.m < monthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);
      const totalPriorCredited = priorMonthsCount * monthlyCreditTotal;
      const carryForwardLeaves = carryForwardEnabled ? Math.max(0, totalPriorCredited - priorUsed) : 0;
      const currentMonthCredited = monthlyCreditTotal;
      const availableLeaves = carryForwardLeaves + currentMonthCredited;

      // Leaves taken in current month
      const currentMonthUsed = empLeaves
        .filter((r) => r.m === monthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);
      const absentDays = absentMap.get(emp.id) || 0;
      const totalDaysTaken = currentMonthUsed + absentDays;

      // Excess leaves
      const excessLeaves = Math.max(0, totalDaysTaken - availableLeaves);
      const leaveDeduction = excessLeaves * perLeaveRate;

      const totalEmpDeductions = totalComponentDeductions + leaveDeduction;
      const netSalary = Math.max(0, inHandSalary - leaveDeduction);

      totalGross += totalEarnings;
      totalDeductions += totalEmpDeductions;
      totalNet += netSalary;
      totalUnpaidDays += excessLeaves;

      const slipRequest = payslipRequestMap.get(emp.id);

      return {
        userId: emp.id,
        code: emp.employee_code,
        name: emp.name,
        dept: emp.department,
        title: emp.title,
        components: comps,
        totalEarnings,
        totalComponentDeductions,
        inHandSalary,
        availableLeaves,
        carryForwardLeaves,
        currentMonthCredited,
        leavesTaken: totalDaysTaken,
        excessLeaves,
        perLeaveRate,
        leaveDeduction,
        deductions: totalEmpDeductions,
        net: netSalary,
        status: runRows?.status || 'Draft',
        slipStatus: slipRequest ? slipRequest.status : 'Not Requested',
        slipRequestId: slipRequest?.id || null,
        slipRequestedAt: slipRequest?.requested_at || null,
        slipRaisedAt: slipRequest?.raised_at || null,
        fileName: slipRequest?.file_name || null,
        fileUrl: slipRequest?.file_url || null,
        fileSize: slipRequest?.file_size || null,
        fileType: slipRequest?.file_type || null,
        slipNotes: slipRequest?.notes || null,
      };
    });

    const isPaid = runRows?.status === 'Paid';
    const isPending = !isPaid;

    return NextResponse.json({
      success: true,
      month,
      stage: runRows?.status || 'Draft',
      paidOn: runRows?.paid_on || null,
      workingDays,
      perLeaveRate,
      cycleDate,
      isPending,
      pendingMessage: isPending
        ? `Salary for ${month} is pending to pay (Salary cycle: 1st of the month).`
        : `Salary for ${month} was marked as paid on ${runRows?.paid_on || '1st of the month'}.`,
      summary: {
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: items.length,
        totalUnpaidDays,
      },
      items,
      payslipRequests,
    });
  } catch (error: any) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const {
      action,
      month = 'November 2026',
      perLeaveRate: customRate,
      userId,
      fileName,
      fileUrl,
      fileSize,
      fileType,
      notes,
    } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    // 1. Fetch policy
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const perLeaveRate = customRate !== undefined ? Number(customRate) : Number(policy?.per_leave_deduction_amount ?? 1000.00);

    // ACTION: update_leave_rate
    if (action === 'update_leave_rate') {
      const newRate = Math.max(0, Number(customRate) || 0);
      await query(
        'UPDATE leave_policies SET per_leave_deduction_amount = ? WHERE company_id = ?',
        [newRate, companyId]
      );
      await query(
        'UPDATE payroll_runs SET per_leave_deduction_amount = ? WHERE company_id = ? AND month = ?',
        [newRate, companyId, month]
      );
      return NextResponse.json({
        success: true,
        message: `Per leave deduction rate updated to ₹${newRate}`,
        perLeaveRate: newRate,
      });
    }

    // ACTION: raise_slip (With optional or required uploaded file)
    if (action === 'raise_slip') {
      const targetUserId = Number(userId);
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'User ID is required to raise payslip' }, { status: 400 });
      }

      let publicFileUrl: string | null = null;
      if (fileUrl) {
        publicFileUrl = String(fileUrl).startsWith('data:')
          ? saveBase64ToPayslips(fileName || `Payslip_${targetUserId}_${month}.pdf`, fileUrl)
          : fileUrl;
      }

      await query(`
        INSERT INTO payslip_requests (company_id, user_id, month, status, file_name, file_url, file_size, file_type, notes, raised_at, raised_by)
        VALUES (?, ?, ?, 'Raised', ?, ?, ?, ?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE 
          status = 'Raised',
          file_name = COALESCE(VALUES(file_name), file_name),
          file_url = COALESCE(VALUES(file_url), file_url),
          file_size = COALESCE(VALUES(file_size), file_size),
          file_type = COALESCE(VALUES(file_type), file_type),
          notes = COALESCE(VALUES(notes), notes),
          raised_at = NOW(),
          raised_by = VALUES(raised_by),
          updated_at = NOW()
      `, [
        companyId,
        targetUserId,
        month,
        fileName || null,
        publicFileUrl || null,
        fileSize || null,
        fileType || null,
        notes || null,
        session?.id || 1,
      ]);

      const [targetUser] = await query<any[]>('SELECT name FROM users WHERE id = ?', [targetUserId]);

      await query(
        `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, 'Payslip raised and uploaded', 'green', ?, NOW())`,
        [
          companyId,
          session?.id || null,
          session?.name || 'HR Manager',
          `Uploaded and issued salary slip${fileName ? ` (${fileName})` : ''} for ${targetUser?.name || 'Employee'} for ${month}`,
        ]
      );

      return NextResponse.json({
        success: true,
        message: `Salary slip for ${targetUser?.name || 'Employee'} has been uploaded and released to the employee`,
        fileUrl: publicFileUrl,
      });
    }

    // ACTION: raise_all_slips
    if (action === 'raise_all_slips') {
      const activeEmps = await query<any[]>(
        "SELECT id FROM users WHERE company_id = ? AND status = 'Active' AND role != 'super'",
        [companyId]
      );
      for (const e of activeEmps) {
        await query(`
          INSERT INTO payslip_requests (company_id, user_id, month, status, raised_at, raised_by)
          VALUES (?, ?, ?, 'Raised', NOW(), ?)
          ON DUPLICATE KEY UPDATE 
            status = 'Raised',
            raised_at = NOW(),
            raised_by = VALUES(raised_by),
            updated_at = NOW()
        `, [companyId, e.id, month, session?.id || 1]);
      }
      return NextResponse.json({
        success: true,
        message: `All salary slips for ${month} have been raised and released to employees`,
      });
    }

    // ACTION: run_payroll
    if (action === 'run_payroll') {
      await query(`
        INSERT INTO payroll_runs (company_id, month, status, per_leave_deduction_amount, cycle_date)
        VALUES (?, ?, 'Finalised', ?, 1)
        ON DUPLICATE KEY UPDATE 
          status = 'Finalised',
          per_leave_deduction_amount = VALUES(per_leave_deduction_amount),
          updated_at = NOW()
      `, [companyId, month, perLeaveRate]);

      await query(
        `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, 'Payroll finalised', 'blue', ?, NOW())`,
        [companyId, session?.id || null, session?.name || 'HR Manager', `Finalised payroll calculation for ${month}`]
      );

      return NextResponse.json({
        success: true,
        message: `Payroll finalized for ${month}`,
        stage: 'Finalised',
      });
    }

    // ACTION: mark_paid
    if (action === 'mark_paid') {
      const todayStr = new Date().toISOString().split('T')[0];

      await query(`
        INSERT INTO payroll_runs (company_id, month, status, paid_on, per_leave_deduction_amount, cycle_date)
        VALUES (?, ?, 'Paid', ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          status = 'Paid',
          paid_on = VALUES(paid_on),
          per_leave_deduction_amount = VALUES(per_leave_deduction_amount),
          updated_at = NOW()
      `, [companyId, month, todayStr, perLeaveRate]);

      await query(
        `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, 'Salary marked as paid', 'green', ?, NOW())`,
        [companyId, session?.id || null, session?.name || 'HR Manager', `Marked ${month} salary as paid on ${todayStr}. Salary pending alert cleared.`]
      );

      return NextResponse.json({
        success: true,
        message: `Payroll for ${month} marked as paid successfully. Dashboard pending alert cleared.`,
        stage: 'Paid',
        paidOn: todayStr,
      });
    }

    // ACTION: reset_draft
    if (action === 'reset_draft') {
      await query(`
        UPDATE payroll_runs 
        SET status = 'Draft', paid_on = NULL, updated_at = NOW()
        WHERE company_id = ? AND month = ?
      `, [companyId, month]);

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
