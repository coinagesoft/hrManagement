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

    // 1. Fetch company leave types
    let leaveTypes = await query<any[]>(`
      SELECT id, name, code, description, type_category, cycle_months, quota_per_cycle, carry_forward, max_carry_forward
      FROM leave_types
      WHERE company_id = ? AND is_active = 1
      ORDER BY id ASC
    `, [companyId]);

    // Fallback seed if none exist
    if (!leaveTypes || leaveTypes.length === 0) {
      await query(`
        INSERT INTO leave_types (company_id, name, code, description, type_category, accrual_frequency, cycle_months, quota_per_cycle, carry_forward, is_active)
        VALUES 
          (?, 'Sick Leave', 'SL', '2 days per 4-month cycle (6 days annual)', 'paid', 'custom_months', 4, 2.0, 1, 1),
          (?, 'Casual Leave', 'CL', '1.5 days per month (18 days annual)', 'paid', 'monthly', 1, 1.5, 1, 1),
          (?, 'Leave Without Pay', 'LWP', 'Unpaid leave without quota restrictions', 'unpaid', 'none', 1, 0, 0, 1)
      `, [companyId, companyId, companyId]);

      leaveTypes = await query<any[]>(`
        SELECT id, name, code, description, type_category, cycle_months, quota_per_cycle, carry_forward, max_carry_forward
        FROM leave_types
        WHERE company_id = ? AND is_active = 1
        ORDER BY id ASC
      `, [companyId]);
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 2. Used leaves breakdown by type and month
    const usedLeavesRows = await query<any[]>(`
      SELECT leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
      FROM leave_requests
      WHERE company_id = ? AND user_id = ? AND status = 'Approved' AND YEAR(start_date) = ?
      GROUP BY leave_type, MONTH(start_date)
    `, [companyId, userId, currentYear]);

    const balancesList: any[] = [];
    const balanceKeyed: Record<string, any> = {};

    for (const lt of leaveTypes) {
      const isPaid = lt.type_category !== 'unpaid';
      const cycleMonths = Number(lt.cycle_months || 1);
      const quotaPerCycle = Number(lt.quota_per_cycle || 0);

      // Match used records by name or code
      const usedThisYear = usedLeavesRows
        .filter((r) => {
          const t = String(r.leave_type || '').toLowerCase();
          return (
            t === lt.name.toLowerCase() ||
            t === lt.code.toLowerCase() ||
            (lt.code === 'SL' && (t.includes('sick') || t === 'sl')) ||
            (lt.code === 'CL' && (t.includes('casual') || t === 'cl')) ||
            (lt.code === 'LWP' && (t.includes('without pay') || t.includes('unpaid') || t === 'lwp'))
          );
        })
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      if (!isPaid) {
        const item = {
          id: lt.id,
          name: lt.name,
          code: lt.code,
          isPaid: false,
          cycleMonths: 1,
          quotaPerCycle: 0,
          annualTotal: 0,
          credited: 0,
          used: usedThisYear,
          left: 'Unlimited',
          formula: 'Unpaid / Leave Without Pay (deducted from payroll)',
          carryForwardEnabled: false,
          perMonth: 0,
        };
        balancesList.push(item);
        balanceKeyed[lt.code] = item;
        balanceKeyed[lt.name] = item;
        balanceKeyed['LWP'] = item;
        balanceKeyed['Unpaid'] = item;
      } else {
        const maxCyclesInYear = Math.max(1, Math.floor(12 / cycleMonths));
        const currentCycle = Math.min(Math.floor((currentMonth - 1) / cycleMonths) + 1, maxCyclesInYear);
        const creditedYtd = Math.round(currentCycle * quotaPerCycle * 10) / 10;
        const totalAnnual = Math.round(maxCyclesInYear * quotaPerCycle * 10) / 10;
        const availableLeft = Math.max(0, Math.round((creditedYtd - usedThisYear) * 10) / 10);

        let cycleLabel = 'month';
        if (cycleMonths === 3) cycleLabel = 'quarter';
        else if (cycleMonths === 4) cycleLabel = '4-month quarter';
        else if (cycleMonths === 6) cycleLabel = 'half-year';
        else if (cycleMonths === 12) cycleLabel = 'year';
        else if (cycleMonths > 1) cycleLabel = `${cycleMonths}-month cycle`;

        const item = {
          id: lt.id,
          name: lt.name,
          code: lt.code,
          isPaid: true,
          cycleMonths,
          quotaPerCycle,
          annualTotal: totalAnnual,
          credited: creditedYtd,
          used: usedThisYear,
          left: availableLeft,
          formula: `${quotaPerCycle} days per ${cycleLabel} (${creditedYtd} credited YTD of ${totalAnnual}/yr)`,
          carryForwardEnabled: Boolean(lt.carry_forward),
          perMonth: cycleMonths === 1 ? quotaPerCycle : Math.round((quotaPerCycle / cycleMonths) * 10) / 10,
        };
        balancesList.push(item);
        balanceKeyed[lt.code] = item;
        balanceKeyed[lt.name] = item;
        if (lt.code === 'CL' || lt.name.toLowerCase().includes('casual')) balanceKeyed['Casual'] = item;
        if (lt.code === 'SL' || lt.name.toLowerCase().includes('sick')) balanceKeyed['Sick'] = item;
      }
    }

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
      balance: balanceKeyed,
      leaveTypes: balancesList,
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

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    // Check if user is deactivated or scheduled for deactivation
    const [uRow] = await query<any[]>(
      'SELECT status, deactivation_date FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const deactDate = uRow?.deactivation_date
      ? (uRow.deactivation_date instanceof Date
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(uRow.deactivation_date)
          : String(uRow.deactivation_date).split('T')[0])
      : null;

    if (uRow && (uRow.status === 'Inactive' || (deactDate && todayStr >= deactDate))) {
      const formattedDate = deactDate ? deactDate.split('-').reverse().join('-') : '';
      return NextResponse.json({
        success: false,
        error: `Requests blocked: Your account has been deactivated${
          formattedDate ? ` effective from ${formattedDate}` : ''
        }.`,
      }, { status: 403 });
    }

    const body = await req.json();
    const { kind, from, to, half = false, why } = body;

    if (!from) {
      return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
    }

    if (deactDate && from >= deactDate) {
      const formattedDate = deactDate.split('-').reverse().join('-');
      return NextResponse.json({
        success: false,
        error: `Cannot submit request for ${from}: Your account is scheduled for deactivation on ${formattedDate}.`,
      }, { status: 400 });
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

    // Fetch active company leave types
    const leaveTypes = await query<any[]>(`
      SELECT id, name, code, type_category, cycle_months, quota_per_cycle, carry_forward
      FROM leave_types
      WHERE company_id = ? AND is_active = 1
    `, [companyId]);

    const targetTypeStr = String(kind || '').trim().toLowerCase();
    const matchedType = leaveTypes.find((lt) => {
      const n = lt.name.toLowerCase();
      const c = lt.code.toLowerCase();
      return (
        n === targetTypeStr ||
        c === targetTypeStr ||
        (c === 'cl' && targetTypeStr.includes('casual')) ||
        (c === 'sl' && targetTypeStr.includes('sick')) ||
        (c === 'lwp' && (targetTypeStr.includes('without pay') || targetTypeStr.includes('unpaid') || targetTypeStr === 'lwp'))
      );
    });

    const isPaid = matchedType
      ? matchedType.type_category !== 'unpaid'
      : !targetTypeStr.includes('unpaid') && !targetTypeStr.includes('without pay') && targetTypeStr !== 'lwp';
    const finalTypeName = matchedType ? matchedType.name : kind;

    // Quota validation for paid leave requests
    if (isPaid && matchedType) {
      const cycleMonths = Number(matchedType.cycle_months || 1);
      const quotaPerCycle = Number(matchedType.quota_per_cycle || 0);
      const reqDate = new Date(from);
      const reqMonth = reqDate.getMonth() + 1; // 1-12
      const reqYear = reqDate.getFullYear();

      const maxCyclesInYear = Math.max(1, Math.floor(12 / cycleMonths));
      const currentCycle = Math.min(Math.floor((reqMonth - 1) / cycleMonths) + 1, maxCyclesInYear);
      const creditedYtd = Math.round(currentCycle * quotaPerCycle * 10) / 10;

      // Used leaves this year for this type (Approved + Pending)
      const [usedRow] = await query<any[]>(`
        SELECT COALESCE(SUM(days_count), 0) AS used_days
        FROM leave_requests
        WHERE company_id = ? AND user_id = ? AND status IN ('Approved', 'Pending') AND YEAR(start_date) = ?
          AND (LOWER(leave_type) = ? OR LOWER(leave_type) = ?)
      `, [companyId, userId, reqYear, matchedType.name.toLowerCase(), matchedType.code.toLowerCase()]);

      const usedDays = Number(usedRow?.used_days || 0);
      const availableLeft = Math.max(0, Math.round((creditedYtd - usedDays) * 10) / 10);

      if (days > availableLeft) {
        return NextResponse.json({
          success: false,
          error: `Insufficient leave balance: You requested ${days} day(s), but only ${availableLeft} day(s) are available for ${matchedType.name} in this cycle (${creditedYtd} credited YTD, ${usedDays} used/pending). You can submit a "Leave Without Pay" (LWP) request instead.`,
        }, { status: 400 });
      }
    }

    const res = await query<any>(`
      INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [companyId, userId, finalTypeName, from, endDate, days, why?.trim() || null]);

    return NextResponse.json({
      success: true,
      message: `${finalTypeName} leave request (${days} day${days > 1 ? 's' : ''}) sent to HR (Pending Approval)`,
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
