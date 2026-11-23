import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { processLeaveAutoApprovals } from '@/lib/leave-auto-approval';
import { sendRequestRejectedEmail } from '@/lib/email';
import { calculateSandwichBlocks, checkLeaveSandwichConflict } from '@/lib/sandwich';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();

    // Process any pending leaves meeting the 48-hour auto-approval criteria
    await processLeaveAutoApprovals(companyId);

    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status') || 'Pending';

    // Fetch company holidays for sandwich check
    const holidays = await query<any[]>(`
      SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, kind
      FROM holidays
      WHERE company_id = ? OR company_id IS NULL
      ORDER BY date ASC
    `, [companyId]);
    const { dateMap: sandwichMap } = calculateSandwichBlocks(
      holidays.map((h) => ({ name: h.name, date: String(h.date) }))
    );

    const leaves = await query<any[]>(`
      SELECT lr.id, lr.leave_type AS type, 
             DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS \`from\`, 
             DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS \`to\`,
             lr.days_count AS days, lr.reason, lr.rejection_reason, lr.status, lr.created_at,
             u.id AS user_id, u.name AS who, u.employee_code AS code, u.department AS dept, u.title
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.company_id = ? AND (? = 'All' OR lr.status = ?)
      ORDER BY lr.created_at DESC
    `, [companyId, filterStatus, filterStatus]);

    const wfhs = await query<any[]>(`
      SELECT wr.id, DATE_FORMAT(wr.date, '%Y-%m-%d') AS date, wr.reason, wr.rejection_reason, wr.status, wr.created_at,
             u.id AS user_id, u.name AS who, u.employee_code AS code, u.department AS dept, u.title
      FROM wfh_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.company_id = ? AND (? = 'All' OR wr.status = ?)
      ORDER BY wr.created_at DESC
    `, [companyId, filterStatus, filterStatus]);

    return NextResponse.json({
      success: true,
      leaves: leaves.map((l) => {
        const lFrom = String(l.from).split('T')[0];
        const lTo = String(l.to).split('T')[0];
        const sandwichConflict = checkLeaveSandwichConflict(lFrom, lTo, sandwichMap);

        return {
          id: l.id,
          who: l.who,
          code: l.code || `EMP-${l.user_id}`,
          dept: l.dept || 'Engineering',
          title: l.title || 'Team Member',
          type: l.type,
          from: lFrom,
          to: lTo,
          days: l.days,
          reason: l.reason,
          rejectionReason: l.rejection_reason || (l.reason?.includes('[Rejection Reason:') ? l.reason.split('[Rejection Reason:')[1]?.replace(/\]$/, '').trim() : null),
          status: l.status,
          sandwichConflict: sandwichConflict.hasConflict ? sandwichConflict : null,
        };
      }),
      wfhs: wfhs.map((w) => ({
        id: w.id,
        who: w.who,
        code: w.code || `EMP-${w.user_id}`,
        dept: w.dept || 'Engineering',
        title: w.title || 'Team Member',
        date: new Date(w.date).toISOString().split('T')[0],
        reason: w.reason,
        rejectionReason: w.rejection_reason || (w.reason?.includes('[Rejection Reason:') ? w.reason.split('[Rejection Reason:')[1]?.replace(/\]$/, '').trim() : null),
        status: w.status,
      })),
      counts: {
        pendingLeaves: leaves.filter((l) => l.status === 'Pending').length,
        pendingWfhs: wfhs.filter((w) => w.status === 'Pending').length,
      },
    });
  } catch (error: any) {
    console.error('Approvals fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve approvals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const session = await getSessionUser();
    const body = await request.json();
    const { id, type, action, reason } = body; // action: 'Approved' | 'Rejected'

    if (!id || !type || !['Approved', 'Rejected'].includes(action)) {
      return NextResponse.json({ error: 'Valid id, type (leave|wfh), and action (Approved|Rejected) are required.' }, { status: 400 });
    }

    if (action === 'Rejected' && (!reason || !String(reason).trim())) {
      return NextResponse.json({ error: 'A reason is strictly required when rejecting a leave or WFH request.' }, { status: 400 });
    }

    const deciderId = session?.id || null;
    const deciderName = session?.name || 'Administrator';
    const rejectNote = reason ? String(reason).trim() : '';

    if (type.toLowerCase() === 'leave') {
      const [leave] = await query<any[]>(
        `SELECT lr.*, u.name, u.email, c.name AS company_name 
         FROM leave_requests lr 
         JOIN users u ON lr.user_id = u.id 
         LEFT JOIN companies c ON lr.company_id = c.id 
         WHERE lr.id = ? AND lr.company_id = ?`,
        [id, companyId]
      );
      if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

      if (action === 'Rejected') {
        await query(
          'UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = NOW(), rejection_reason = ? WHERE id = ?',
          [action, deciderId, rejectNote, id]
        );

        if (leave.email) {
          const fromStr = new Date(leave.start_date).toISOString().split('T')[0];
          const toStr = new Date(leave.end_date).toISOString().split('T')[0];
          sendRequestRejectedEmail({
            toEmail: leave.email,
            employeeName: leave.name,
            companyName: leave.company_name || 'PeopleDesk HR',
            requestType: `${leave.leave_type} Leave`,
            period: fromStr === toStr ? fromStr : `${fromStr} to ${toStr} (${leave.days_count}d)`,
            employeeReason: leave.reason,
            rejectionReason: rejectNote,
            deciderName,
          }).catch((err) => console.error('Failed to dispatch rejection email:', err));
        }
      } else {
        await query(
          'UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
          [action, deciderId, id]
        );
      }

      // Log action
      await query(
        `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          companyId,
          deciderName,
          `Leave ${action.toLowerCase()}`,
          action === 'Approved' ? 'green' : 'rose',
          `${leave.name}, ${leave.leave_type} leave (${leave.days_count}d)${action === 'Rejected' ? ` · Reason: ${rejectNote}` : ''}`,
        ]
      );
    } else {
      const [wfh] = await query<any[]>(
        `SELECT wr.*, u.name, u.email, c.name AS company_name 
         FROM wfh_requests wr 
         JOIN users u ON wr.user_id = u.id 
         LEFT JOIN companies c ON wr.company_id = c.id 
         WHERE wr.id = ? AND wr.company_id = ?`,
        [id, companyId]
      );
      if (!wfh) return NextResponse.json({ error: 'WFH request not found' }, { status: 404 });

      if (action === 'Rejected') {
        await query(
          'UPDATE wfh_requests SET status = ?, decided_by = ?, decided_at = NOW(), rejection_reason = ? WHERE id = ?',
          [action, deciderId, rejectNote, id]
        );

        if (wfh.email) {
          const wfhDateStr = new Date(wfh.date).toISOString().split('T')[0];
          sendRequestRejectedEmail({
            toEmail: wfh.email,
            employeeName: wfh.name,
            companyName: wfh.company_name || 'PeopleDesk HR',
            requestType: 'Work From Home (WFH)',
            period: wfhDateStr,
            employeeReason: wfh.reason,
            rejectionReason: rejectNote,
            deciderName,
          }).catch((err) => console.error('Failed to dispatch rejection email:', err));
        }
      } else {
        await query(
          'UPDATE wfh_requests SET status = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
          [action, deciderId, id]
        );
      }

      // Log action
      await query(
        `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          companyId,
          deciderName,
          `WFH ${action.toLowerCase()}`,
          action === 'Approved' ? 'teal' : 'rose',
          `${wfh.name}, WFH for ${new Date(wfh.date).toISOString().split('T')[0]}${action === 'Rejected' ? ` · Reason: ${rejectNote}` : ''}`,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action.toLowerCase()} successfully.`,
    });
  } catch (error: any) {
    console.error('Approvals update error:', error);
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
  }
}
