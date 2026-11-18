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

    const rows = await query<any[]>(`
      SELECT 
        u.id,
        u.employee_code,
        u.name,
        u.department AS dept,
        u.title,
        COALESCE(s.basic, 40000.00) AS basic,
        COALESCE(s.hra, 18000.00) AS hra,
        COALESCE(s.other, 12000.00) AS other,
        COALESCE(s.fixed, 2000.00) AS fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = ? AND u.status = 'Active' AND u.role != 'super'
      ORDER BY u.id ASC
    `, [companyId]);

    const structures = rows.map((r) => {
      const basic = Number(r.basic);
      const hra = Number(r.hra);
      const other = Number(r.other);
      const fixed = Number(r.fixed);
      const gross = basic + hra + other;

      return {
        id: r.id,
        userId: r.id,
        code: r.employee_code,
        name: r.name,
        dept: r.dept,
        title: r.title,
        basic,
        hra,
        other,
        fixed,
        gross,
      };
    });

    return NextResponse.json({ success: true, structures });
  } catch (error: any) {
    console.error('Salary structure GET error:', error);
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
    const { userId, basic, hra, other, fixed } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const b = Math.max(0, Number(basic) || 0);
    const h = Math.max(0, Number(hra) || 0);
    const o = Math.max(0, Number(other) || 0);
    const f = Math.max(0, Number(fixed) || 0);

    await query(`
      INSERT INTO salary_structures (company_id, user_id, basic, hra, other, fixed)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        basic = VALUES(basic),
        hra = VALUES(hra),
        other = VALUES(other),
        fixed = VALUES(fixed),
        updated_at = NOW()
    `, [companyId, userId, b, h, o, f]);

    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, target_type, target_id, details)
       VALUES (?, ?, 'update_salary_structure', 'user', ?, ?)`,
      [companyId, session?.id || 1, userId, `Updated salary: Basic ₹${b}, HRA ₹${h}, Other ₹${o}, Fixed ₹${f}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Salary structure updated successfully',
      structure: {
        userId,
        basic: b,
        hra: h,
        other: o,
        fixed: f,
        gross: b + h + o,
      },
    });
  } catch (error: any) {
    console.error('Salary structure PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
