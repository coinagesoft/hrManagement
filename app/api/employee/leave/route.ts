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

    // 1. Leave Policy
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const casualPerMo = Number(policy?.casual_per_month ?? 1.0);
    const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
    const paidPerYr = Number(policy?.paid_per_year ?? 12);

    const casualCredited = Math.round(casualPerMo * 11 * 10) / 10;
    const sickCredited = Math.round(sickPerMo * 11 * 10) / 10;
    const paidCredited = paidPerYr;

    // 2. Used leaves
    const usedLeaves = await query<any[]>(`
      SELECT leave_type, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved'
      GROUP BY leave_type
    `, [companyId, userId]);

    const usedMap: Record<string, number> = { Casual: 0, Sick: 0, Paid: 0 };
    usedLeaves.forEach((r) => {
      usedMap[r.leave_type] = Number(r.used_days);
    });

    const balance = {
      Casual: {
        credited: casualCredited,
        used: usedMap.Casual || 0,
        left: Math.max(0, casualCredited - (usedMap.Casual || 0)),
        perMonth: casualPerMo,
      },
      Sick: {
        credited: sickCredited,
        used: usedMap.Sick || 0,
        left: Math.max(0, sickCredited - (usedMap.Sick || 0)),
        perMonth: sickPerMo,
      },
      Paid: {
        credited: paidCredited,
        used: usedMap.Paid || 0,
        left: Math.max(0, paidCredited - (usedMap.Paid || 0)),
      },
    };

    // 3. Employee Leave Requests
    const leaves = await query<any[]>(`
      SELECT id, leave_type AS type, start_date, end_date, days_count AS days, reason, status, created_at
      FROM leave_requests
      WHERE company_id = ? AND user_id = ?
      ORDER BY start_date DESC
    `, [companyId, userId]);

    // 4. Employee WFH Requests
    const wfh = await query<any[]>(`
      SELECT id, date AS start_date, date AS end_date, 1 AS days, reason, status, created_at
      FROM wfh_requests
      WHERE company_id = ? AND user_id = ?
      ORDER BY date DESC
    `, [companyId, userId]);

    const fmt = (d: any) => (d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0]);

    const history = [
      ...leaves.map((l) => ({
        id: l.id,
        kind: 'leave',
        type: l.type,
        from: fmt(l.start_date),
        to: fmt(l.end_date),
        days: Number(l.days),
        reason: l.reason,
        status: l.status,
      })),
      ...wfh.map((w) => ({
        id: w.id,
        kind: 'wfh',
        type: 'Work from home',
        from: fmt(w.start_date),
        to: fmt(w.end_date),
        days: 1,
        reason: w.reason,
        status: w.status,
      })),
    ].sort((a, b) => b.from.localeCompare(a.from));

    return NextResponse.json({
      success: true,
      balance,
      history,
    });
  } catch (error: any) {
    console.error('Employee leave GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { kind, from, to, half = false, why } = body;

    if (!from) {
      return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
    }

    const endDate = to || from;
    if (endDate < from) {
      return NextResponse.json({ success: false, error: 'End date cannot be before start date' }, { status: 400 });
    }

    if (kind === 'Work from home' || kind === 'WFH') {
      const res = await query<any>(`
        INSERT INTO wfh_requests (company_id, user_id, date, reason, status)
        VALUES (?, ?, ?, ?, 'Pending')
      `, [companyId, userId, from, why?.trim() || null]);

      return NextResponse.json({
        success: true,
        message: 'Work from home request sent to HR',
        id: res.insertId,
      });
    }

    // Leave request: calculate days
    const d1 = new Date(from);
    const d2 = new Date(endDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (half && from === endDate) days = 0.5;

    const res = await query<any>(`
      INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [companyId, userId, kind, from, endDate, days, why?.trim() || null]);

    return NextResponse.json({
      success: true,
      message: `${kind} leave request sent to HR`,
      id: res.insertId,
    });
  } catch (error: any) {
    console.error('Employee leave POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const kind = searchParams.get('kind');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Request ID is required' }, { status: 400 });
    }

    if (kind === 'wfh') {
      await query(
        "DELETE FROM wfh_requests WHERE id = ? AND user_id = ? AND status = 'Pending'",
        [id, userId]
      );
    } else {
      await query(
        "DELETE FROM leave_requests WHERE id = ? AND user_id = ? AND status = 'Pending'",
        [id, userId]
      );
    }

    return NextResponse.json({ success: true, message: 'Request cancelled' });
  } catch (error: any) {
    console.error('Employee leave DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
