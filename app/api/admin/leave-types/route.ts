import { NextResponse, connection } from 'next/server';
import { getSessionUser, requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

async function resolveCompanyId(req?: Request): Promise<number> {
  const session = await getSessionUser(req);
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET(req: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId(req);

    // Auto-seed default leave types if not yet created for this company
    const [existing] = await query<any[]>(
      'SELECT COUNT(*) as count FROM leave_types WHERE company_id = ?',
      [companyId]
    );

    if (existing?.count === 0) {
      // 1. Sick Leave (2 days per 4-month cycle -> 6 days/year as requested)
      await query(`
        INSERT INTO leave_types (company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, is_active)
        VALUES (?, 'Sick Leave', 'SL', '2 days per 4-month cycle (6 days annual)', 'paid', 'custom_months', 4, 2.0, 1, 1)
      `, [companyId]);

      // 2. Casual Leave (1.5 days per month -> 18 days/year)
      await query(`
        INSERT INTO leave_types (company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, is_active)
        VALUES (?, 'Casual Leave', 'CL', '1.5 days per month (18 days annual)', 'paid', 'monthly', 1, 1.5, 1, 1)
      `, [companyId]);

      // 3. Leave Without Pay (LWP / Unpaid)
      await query(`
        INSERT INTO leave_types (company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, is_active)
        VALUES (?, 'Leave Without Pay', 'LWP', 'Unpaid leave without quota restrictions', 'unpaid', 'none', 1, 0, 0, 1)
      `, [companyId]);
    }

    const rows = await query<any[]>(`
      SELECT id, company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, max_carry_forward, is_active, created_at
      FROM leave_types
      WHERE company_id = ?
      ORDER BY id ASC
    `, [companyId]);

    const leaveTypes = rows.map((r) => {
      const cycleMonths = Number(r.cycle_months || 1);
      const quotaPerCycle = Number(r.quota_per_cycle || 0);
      const annualTotal = r.type_category === 'unpaid' ? 0 : Math.round((12 / cycleMonths) * quotaPerCycle * 10) / 10;

      return {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || '',
        category: r.type_category as 'paid' | 'unpaid',
        cycleMonths,
        quotaPerCycle,
        annualTotal,
        carryForward: Boolean(r.carry_forward),
        maxCarryForward: Number(r.max_carry_forward || 999),
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      leaveTypes,
    });
  } catch (error: any) {
    console.error('Leave types GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const auth = await requireAuth(req, ['admin', 'super']);
    if (auth.errorResponse) return auth.errorResponse;
    const session = auth.user;
    const companyId = session.companyId || (await resolveCompanyId(req));

    const body = await req.json();
    const {
      name,
      code,
      description,
      category = 'paid',
      cycleMonths = 1,
      quotaPerCycle = 1.0,
      carryForward = true,
      maxCarryForward = 999,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Leave type name is required' }, { status: 400 });
    }
    if (!code || !String(code).trim()) {
      return NextResponse.json({ error: 'Leave type code is required' }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const cleanCode = String(code).trim().toUpperCase();
    const cleanCategory = category === 'unpaid' ? 'unpaid' : 'paid';
    const cleanCycleMonths = Math.max(1, Math.min(12, parseInt(String(cycleMonths), 10) || 1));
    const cleanQuota = cleanCategory === 'unpaid' ? 0 : Math.max(0, Math.min(100, parseFloat(String(quotaPerCycle)) || 0));

    // Check duplicate code or name
    const [existing] = await query<any[]>(
      'SELECT id FROM leave_types WHERE company_id = ? AND (LOWER(name) = ? OR UPPER(code) = ?) LIMIT 1',
      [companyId, cleanName.toLowerCase(), cleanCode]
    );

    if (existing) {
      return NextResponse.json(
        { error: `A leave type with name "${cleanName}" or code "${cleanCode}" already exists in your company.` },
        { status: 400 }
      );
    }

    const res = await query<any>(`
      INSERT INTO leave_types 
        (company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, max_carry_forward, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `, [
      companyId,
      cleanName,
      cleanCode,
      description?.trim() || null,
      cleanCategory,
      cleanCycleMonths === 1 ? 'monthly' : cleanCycleMonths === 3 ? 'quarterly' : cleanCycleMonths === 12 ? 'yearly' : 'custom_months',
      cleanCycleMonths,
      cleanQuota,
      carryForward ? 1 : 0,
      maxCarryForward || 999,
    ]);

    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Leave type created', 'blue', ?, NOW())`,
      [
        companyId,
        session.id,
        session.name,
        `Admin created leave type "${cleanName}" (${cleanCode}): ${cleanCategory === 'paid' ? `${cleanQuota} per ${cleanCycleMonths}-mo cycle` : 'Unpaid'}`
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Leave type "${cleanName}" added successfully.`,
      id: res.insertId,
    });
  } catch (error: any) {
    console.error('Leave type POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const auth = await requireAuth(req, ['admin', 'super']);
    if (auth.errorResponse) return auth.errorResponse;
    const session = auth.user;
    const companyId = session.companyId || (await resolveCompanyId(req));

    const body = await req.json();
    const { id, name, code, description, category, cycleMonths, quotaPerCycle, carryForward, maxCarryForward, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Leave type ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(String(name).trim());
    }
    if (code !== undefined) {
      updates.push('code = ?');
      values.push(String(code).trim().toUpperCase());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ? String(description).trim() : null);
    }
    if (category !== undefined) {
      updates.push('type_category = ?');
      values.push(category === 'unpaid' ? 'unpaid' : 'paid');
    }
    if (cycleMonths !== undefined) {
      updates.push('cycle_months = ?');
      values.push(Math.max(1, Math.min(12, parseInt(String(cycleMonths), 10) || 1)));
    }
    if (quotaPerCycle !== undefined) {
      updates.push('quota_per_cycle = ?');
      values.push(Math.max(0, parseFloat(String(quotaPerCycle)) || 0));
    }
    if (carryForward !== undefined) {
      updates.push('carry_forward = ?');
      values.push(carryForward ? 1 : 0);
    }
    if (maxCarryForward !== undefined) {
      updates.push('max_carry_forward = ?');
      values.push(Number(maxCarryForward) || 999);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(Number(id), companyId);
    await query(
      `UPDATE leave_types SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND company_id = ?`,
      values
    );

    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Leave type updated', 'blue', ?, NOW())`,
      [companyId, session.id, session.name, `Admin updated leave type #${id}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Leave type updated successfully.',
    });
  } catch (error: any) {
    console.error('Leave type PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await connection();
  try {
    const auth = await requireAuth(req, ['admin', 'super']);
    if (auth.errorResponse) return auth.errorResponse;
    const session = auth.user;
    const companyId = session.companyId || (await resolveCompanyId(req));

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Leave type ID is required' }, { status: 400 });
    }

    // Check if any leave requests use this leave type
    const [lt] = await query<any[]>('SELECT name, code FROM leave_types WHERE id = ? AND company_id = ?', [Number(id), companyId]);
    if (!lt) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    const [used] = await query<any[]>(
      'SELECT COUNT(*) as count FROM leave_requests WHERE company_id = ? AND (LOWER(leave_type) = ? OR LOWER(leave_type) = ?)',
      [companyId, lt.name.toLowerCase(), lt.code.toLowerCase()]
    );

    if (used?.count > 0) {
      // Soft disable to preserve historical records
      await query('UPDATE leave_types SET is_active = 0, updated_at = NOW() WHERE id = ? AND company_id = ?', [Number(id), companyId]);
      return NextResponse.json({
        success: true,
        message: `"${lt.name}" was deactivated (has ${used.count} existing historical request records).`,
      });
    }

    // Hard delete if never used
    await query('DELETE FROM leave_types WHERE id = ? AND company_id = ?', [Number(id), companyId]);
    return NextResponse.json({
      success: true,
      message: `"${lt.name}" removed successfully.`,
    });
  } catch (error: any) {
    console.error('Leave type DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
