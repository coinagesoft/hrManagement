import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { processLeaveAutoApprovals } from '@/lib/leave-auto-approval';

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

    // Process any pending leaves meeting the 48-hour auto-approval criteria
    await processLeaveAutoApprovals(companyId);

    // 1. Leave Policy with Carry Forward
    const [policy] = await query<any[]>(
      'SELECT * FROM leave_policies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const casualPerMo = Number(policy?.casual_per_month ?? 1.5);
    const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
    const carryForwardEnabled = Boolean(policy?.carry_forward_enabled ?? 1);

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12 (November is 11)
    const currentYear = now.getFullYear();
    const priorMonthsCount = Math.max(0, currentMonth - 1);

    // 2. Used leaves breakdown by type and month
    const usedLeavesRows = await query<any[]>(`
      SELECT leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved' AND YEAR(start_date) = ?
      GROUP BY leave_type, MONTH(start_date)
    `, [companyId, userId, currentYear]);

    function computeLeaveBalance(type: string, ratePerMo: number) {
      const priorUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === type.toLowerCase() && r.m < currentMonth)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      const currentUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === type.toLowerCase() && r.m === currentMonth)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      const totalUsedYtd = priorUsed + currentUsed;

      let carriedForward = 0;
      if (carryForwardEnabled && priorMonthsCount > 0) {
        const priorAccrued = Math.round(priorMonthsCount * ratePerMo * 10) / 10;
        carriedForward = Math.max(0, Math.round((priorAccrued - priorUsed) * 10) / 10);
      }

      const currentMonthAccrual = ratePerMo;
      const totalAvailable = Math.max(0, Math.round((carriedForward + currentMonthAccrual - currentUsed) * 10) / 10);
      const totalCredited = Math.round((carriedForward + currentMonthAccrual + priorUsed) * 10) / 10;

      return {
        perMonth: ratePerMo,
        carriedForward,
        currentMonthAccrual,
        credited: totalCredited,
        used: totalUsedYtd,
        left: totalAvailable,
        carryForwardEnabled,
        formula: carryForwardEnabled
          ? `${carriedForward.toFixed(1)} carried + ${currentMonthAccrual.toFixed(1)} this month`
          : `${currentMonthAccrual.toFixed(1)}/month`,
      };
    }

    const balance = {
      Casual: computeLeaveBalance('Casual', casualPerMo),
      Sick: computeLeaveBalance('Sick', sickPerMo),
    };

    // 3. Employee Leave Requests
    const leaves = await query<any[]>(`
      SELECT id, leave_type AS type, start_date, end_date, days_count AS days, reason, rejection_reason, status, created_at
      FROM leave_requests
      WHERE company_id = ? AND user_id = ?
      ORDER BY start_date DESC
    `, [companyId, userId]);

    // 4. Employee WFH Requests
    const wfh = await query<any[]>(`
      SELECT id, date AS start_date, date AS end_date, 1 AS days, reason, rejection_reason, status, created_at
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
        rejectionReason: l.rejection_reason || (l.reason?.includes('[Rejection Reason:') ? l.reason.split('[Rejection Reason:')[1]?.replace(/\]$/, '').trim() : null),
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
        rejectionReason: w.rejection_reason || (w.reason?.includes('[Rejection Reason:') ? w.reason.split('[Rejection Reason:')[1]?.replace(/\]$/, '').trim() : null),
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
    const { kind, from, to, half = false, why } = body;

    if (!from) {
      return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
    }

    if (!why || !String(why).trim()) {
      return NextResponse.json({ success: false, error: 'Reason is required for all leave and WFH requests' }, { status: 400 });
    }

    const endDate = to || from;
    if (endDate < from) {
      return NextResponse.json({ success: false, error: 'End date cannot be before start date' }, { status: 400 });
    }

    if (kind === 'Work from home' || kind === 'WFH') {
      const cur = new Date(from);
      const end = new Date(endDate);
      let count = 0;

      while (cur <= end) {
        const curDateStr = cur.toISOString().split('T')[0];
        await query(`
          INSERT INTO wfh_requests (company_id, user_id, date, reason, status)
          VALUES (?, ?, ?, ?, 'Pending')
          ON DUPLICATE KEY UPDATE reason = VALUES(reason), status = 'Pending'
        `, [companyId, userId, curDateStr, why?.trim() || null]);
        count++;
        cur.setDate(cur.getDate() + 1);
      }

      return NextResponse.json({
        success: true,
        message: count > 1
          ? `Work from home request for ${count} days sent to HR (Pending Approval)`
          : 'Work from home request sent to HR (Pending Approval)',
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
    const session = await getSessionUser(req);
    if (!session?.id || !session?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is missing or invalid', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const userId = session.id;
    const companyId = session.companyId;

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
