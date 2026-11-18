import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    return NextResponse.json({
      success: true,
      policy: {
        casual: Number(policy?.casual_per_month ?? 1.0),
        sick: Number(policy?.sick_per_month ?? 1.0),
        paid: Number(policy?.paid_per_year ?? 12),
        workingDays: Number(policy?.working_days_per_month ?? 22),
      },
    });
  } catch (error: any) {
    console.error('Leave policy GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const casual = Math.max(0, Math.min(5, Number(body.casual ?? 1.0)));
    const sick = Math.max(0, Math.min(5, Number(body.sick ?? 1.0)));
    const paid = Math.max(0, Math.min(30, Number(body.paid ?? 12)));
    const workingDays = Math.max(15, Math.min(31, Number(body.workingDays ?? 22)));

    await query(`
      INSERT INTO leave_policies (company_id, casual_per_month, sick_per_month, paid_per_year, working_days_per_month)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        casual_per_month = VALUES(casual_per_month),
        sick_per_month = VALUES(sick_per_month),
        paid_per_year = VALUES(paid_per_year),
        working_days_per_month = VALUES(working_days_per_month),
        updated_at = NOW()
    `, [companyId, casual, sick, paid, workingDays]);

    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, target_type, target_id, details)
       VALUES (?, ?, 'update_leave_policy', 'company', ?, ?)`,
      [companyId, session?.id || 1, companyId, `Updated leave policy: Casual ${casual}/mo, Sick ${sick}/mo, Paid ${paid}/yr, Working days ${workingDays}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Leave policy updated successfully',
      policy: { casual, sick, paid, workingDays },
    });
  } catch (error: any) {
    console.error('Leave policy PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
