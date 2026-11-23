import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  mode?: 'amount' | 'percentage';
  percentage?: number;
  amount: number;
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

    const rows = await query<any[]>(`
      SELECT 
        u.id,
        u.employee_code,
        u.name,
        u.department AS dept,
        u.title,
        COALESCE(s.in_hand_salary, 0.00) AS in_hand_salary,
        s.components,
        COALESCE(s.basic, 15000.00) AS basic,
        COALESCE(s.hra, 5000.00) AS hra,
        COALESCE(s.other, 5000.00) AS other,
        COALESCE(s.fixed, 0.00) AS fixed
      FROM users u
      LEFT JOIN salary_structures s ON s.user_id = u.id AND s.company_id = u.company_id
      WHERE u.company_id = ? AND u.status = 'Active' AND u.role != 'super'
      ORDER BY u.id ASC
    `, [companyId]);

    // Fetch available component types for company
    const componentTypes = await query<any[]>(
      'SELECT id, name, type FROM salary_component_types WHERE company_id = ? AND is_active = 1 ORDER BY type DESC, id ASC',
      [companyId]
    );

    const structures = rows.map((r) => {
      let comps: SalaryComponent[] = [];
      if (r.components) {
        try {
          comps = typeof r.components === 'string' ? JSON.parse(r.components) : r.components;
        } catch {
          comps = [];
        }
      }

      // If no components exist, construct default segregation
      if (!comps || !Array.isArray(comps) || comps.length === 0) {
        const b = Number(r.basic) || 15000;
        const h = Number(r.hra) || 5000;
        const o = Number(r.other) || 5000;
        const f = Number(r.fixed) || 0;
        comps = [
          { name: 'Base Salary', type: 'earning', mode: 'amount', amount: b },
          { name: 'Allowance', type: 'earning', mode: 'amount', amount: o },
          { name: 'Accommodation', type: 'earning', mode: 'amount', amount: h },
        ];
        if (f > 0) {
          comps.push({ name: 'Fixed Deduction', type: 'deduction', mode: 'amount', amount: f });
        }
      }

      const totalEarnings = comps
        .filter((c) => c.type === 'earning')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalDeductions = comps
        .filter((c) => c.type === 'deduction')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const derivedInHand = Math.max(0, totalEarnings - totalDeductions);
      const inHandSalary = Number(r.in_hand_salary) > 0 ? Number(r.in_hand_salary) : derivedInHand;

      // Ensure every component has both percentage and amount calculated
      const normalizedComps = comps.map((c) => {
        const amt = Number(c.amount) || 0;
        const pct = inHandSalary > 0
          ? Math.round((amt / inHandSalary) * 100 * 10) / 10
          : (c.percentage || 0);
        return {
          name: c.name,
          type: c.type || 'earning',
          mode: c.mode || 'amount',
          percentage: pct,
          amount: amt,
        };
      });

      return {
        id: r.id,
        userId: r.id,
        code: r.employee_code,
        name: r.name,
        dept: r.dept,
        title: r.title,
        inHandSalary,
        totalEarnings,
        totalDeductions,
        components: normalizedComps,
        basic: Number(r.basic) || totalEarnings,
        hra: Number(r.hra) || 0,
        other: Number(r.other) || 0,
        fixed: Number(r.fixed) || totalDeductions,
      };
    });

    return NextResponse.json({ success: true, structures, componentTypes });
  } catch (error: any) {
    console.error('Salary structure GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { userId, inHandSalary: rawInHand, components: rawComps, basic, hra, other, fixed } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const targetInHand = Number(rawInHand) || 0;

    let comps: SalaryComponent[] = [];
    if (Array.isArray(rawComps) && rawComps.length > 0) {
      comps = rawComps.map((c: any) => {
        const mode = c.mode === 'percentage' ? 'percentage' : 'amount';
        let amt = Math.max(0, Number(c.amount) || 0);
        let pct = Math.max(0, Number(c.percentage) || 0);

        if (mode === 'percentage' && targetInHand > 0 && pct > 0) {
          amt = Math.round((targetInHand * pct) / 100);
        } else if (targetInHand > 0 && amt > 0) {
          pct = Math.round((amt / targetInHand) * 100 * 10) / 10;
        }

        return {
          name: String(c.name || 'Component').trim(),
          type: c.type === 'deduction' ? 'deduction' : 'earning',
          mode,
          percentage: pct,
          amount: amt,
        };
      });
    } else {
      // Legacy fallback
      const b = Math.max(0, Number(basic) || 0);
      const h = Math.max(0, Number(hra) || 0);
      const o = Math.max(0, Number(other) || 0);
      const f = Math.max(0, Number(fixed) || 0);
      comps = [
        { name: 'Base Salary', type: 'earning', mode: 'amount', amount: b },
        { name: 'Allowance', type: 'earning', mode: 'amount', amount: o },
        { name: 'Accommodation', type: 'earning', mode: 'amount', amount: h },
      ];
      if (f > 0) {
        comps.push({ name: 'Fixed Deduction', type: 'deduction', mode: 'amount', amount: f });
      }
    }

    const totalEarnings = comps
      .filter((c) => c.type === 'earning')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalDeductions = comps
      .filter((c) => c.type === 'deduction')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const calculatedInHand = targetInHand > 0 ? targetInHand : Math.max(0, totalEarnings - totalDeductions);

    // Map to legacy columns for backward compatibility
    const baseItem = comps.find((c) => /base|basic/i.test(c.name));
    const accomItem = comps.find((c) => /accom|hra/i.test(c.name));
    const b = baseItem ? baseItem.amount : totalEarnings;
    const h = accomItem ? accomItem.amount : 0;
    const o = Math.max(0, totalEarnings - b - h);
    const f = totalDeductions;

    await query(`
      INSERT INTO salary_structures (company_id, user_id, in_hand_salary, components, basic, hra, other, fixed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        in_hand_salary = VALUES(in_hand_salary),
        components = VALUES(components),
        basic = VALUES(basic),
        hra = VALUES(hra),
        other = VALUES(other),
        fixed = VALUES(fixed),
        updated_at = NOW()
    `, [companyId, userId, calculatedInHand, JSON.stringify(comps), b, h, o, f]);

    const userName = session?.name || 'HR Manager';
    const breakdownSummary = comps.map((c) => `${c.name}: ${c.mode === 'percentage' ? `${c.percentage}% (` : ''}₹${c.amount}${c.mode === 'percentage' ? ')' : ''}`).join(', ');
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Salary structure updated', 'green', ?, NOW())`,
      [companyId, session?.id || null, userName, `Updated salary for user ID ${userId}: In-hand ₹${calculatedInHand} (${breakdownSummary})`]
    );

    return NextResponse.json({
      success: true,
      message: 'Salary structure and segregation updated successfully',
      structure: {
        userId,
        inHandSalary: calculatedInHand,
        totalEarnings,
        totalDeductions,
        components: comps,
      },
    });
  } catch (error: any) {
    console.error('Salary structure PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
