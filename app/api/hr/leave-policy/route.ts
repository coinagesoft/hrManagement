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
        casual: Number(policy?.casual_per_month ?? 1.5),
        sick: Number(policy?.sick_per_month ?? 1.0),
        workingDays: Number(policy?.working_days_per_month ?? 22),
        carryForwardEnabled: Boolean(policy?.carry_forward_enabled ?? 1),
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
    const casual = Math.max(0, Math.min(10, Number(body.casual ?? 1.5)));
    const sick = Math.max(0, Math.min(10, Number(body.sick ?? 1.0)));
    const paid = 0; // Only SL and CL supported
    const workingDays = Math.max(15, Math.min(31, Number(body.workingDays ?? 22)));
    const carryForward = body.carryForwardEnabled !== false ? 1 : 0;
    const maxCarry = 9999; // Unlimited carry forward

    await query(`
      INSERT INTO leave_policies 
        (company_id, casual_per_month, sick_per_month, paid_per_year, working_days_per_month, carry_forward_enabled, max_carry_forward)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        casual_per_month = VALUES(casual_per_month),
        sick_per_month = VALUES(sick_per_month),
        paid_per_year = VALUES(paid_per_year),
        working_days_per_month = VALUES(working_days_per_month),
        carry_forward_enabled = VALUES(carry_forward_enabled),
        max_carry_forward = VALUES(max_carry_forward),
        updated_at = NOW()
    `, [companyId, casual, sick, paid, workingDays, carryForward, maxCarry]);

    const userName = session?.name || 'Administrator';
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Leave policy updated', 'blue', ?, NOW())`,
      [companyId, session?.id || null, userName, `Updated leave policy: CL ${casual}/mo, SL ${sick}/mo, Carry Forward: ${carryForward ? 'Enabled (Unlimited)' : 'Disabled'}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Leave policy updated successfully',
      policy: {
        casual,
        sick,
        workingDays,
        carryForwardEnabled: Boolean(carryForward),
      },
    });
  } catch (error: any) {
    console.error('Leave policy PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
