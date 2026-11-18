import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
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

    const rows = await query<any[]>(`
      SELECT 
        pi.id,
        pr.month,
        pr.paid_on,
        pr.status AS run_status,
        pi.basic,
        pi.hra,
        pi.other,
        pi.gross,
        pi.unpaid_days,
        pi.unpaid_deduction,
        pi.fixed_deduction,
        pi.net,
        pi.status,
        u.name AS employee_name,
        u.employee_code,
        u.title,
        c.name AS company_name
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.id
      JOIN users u ON pi.user_id = u.id
      JOIN companies c ON pr.company_id = c.id
      WHERE pr.company_id = ? AND pi.user_id = ? AND pr.status = 'Paid'
      ORDER BY pr.paid_on DESC, pr.id DESC
    `, [companyId, userId]);

    const payslips = rows.map((r) => ({
      id: r.id,
      month: r.month,
      paidOn: r.paid_on instanceof Date ? r.paid_on.toISOString().split('T')[0] : String(r.paid_on).split('T')[0],
      status: r.status,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      title: r.title,
      companyName: r.company_name,
      basic: Number(r.basic),
      hra: Number(r.hra),
      other: Number(r.other),
      gross: Number(r.gross),
      unpaidDays: Number(r.unpaid_days),
      unpaidDed: Number(r.unpaid_deduction),
      fixed: Number(r.fixed_deduction),
      net: Number(r.net),
    }));

    return NextResponse.json({ success: true, payslips });
  } catch (error: any) {
    console.error('Employee payslips GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
