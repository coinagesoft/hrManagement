import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

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
    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status') || 'Pending';

    const leaves = await query<any[]>(`
      SELECT lr.id, lr.leave_type AS type, lr.start_date AS \`from\`, lr.end_date AS \`to\`,
             lr.days_count AS days, lr.reason, lr.status, lr.created_at,
             u.id AS user_id, u.name AS who, u.department AS dept, u.title
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.company_id = ? AND (? = 'All' OR lr.status = ?)
      ORDER BY lr.created_at DESC
    `, [companyId, filterStatus, filterStatus]);

    const wfhs = await query<any[]>(`
      SELECT wr.id, wr.date, wr.reason, wr.status, wr.created_at,
             u.id AS user_id, u.name AS who, u.department AS dept, u.title
      FROM wfh_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.company_id = ? AND (? = 'All' OR wr.status = ?)
      ORDER BY wr.created_at DESC
    `, [companyId, filterStatus, filterStatus]);

    return NextResponse.json({
      success: true,
      leaves: leaves.map((l) => ({
        id: l.id,
        who: l.who,
        type: l.type,
        from: new Date(l.from).toISOString().split('T')[0],
        to: new Date(l.to).toISOString().split('T')[0],
        days: l.days,
        reason: l.reason,
        status: l.status,
      })),
      wfhs: wfhs.map((w) => ({
        id: w.id,
        who: w.who,
        date: new Date(w.date).toISOString().split('T')[0],
        reason: w.reason,
        status: w.status,
      })),
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
    const { id, type, action } = body; // action: 'Approved' | 'Rejected'

    if (!id || !type || !['Approved', 'Rejected'].includes(action)) {
      return NextResponse.json({ error: 'Valid id, type (leave|wfh), and action (Approved|Rejected) are required.' }, { status: 400 });
    }

    const deciderId = session?.id || null;
    const deciderName = session?.name || 'Administrator';

    if (type.toLowerCase() === 'leave') {
      const [leave] = await query<any[]>(
        'SELECT lr.*, u.name FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE lr.id = ? AND lr.company_id = ?',
        [id, companyId]
      );
      if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

      await query(
        'UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
        [action, deciderId, id]
      );

      // Log action
      await query(
        `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [companyId, deciderName, `Leave ${action.toLowerCase()}`, action === 'Approved' ? 'green' : 'rose', `${leave.name}, ${leave.leave_type} leave (${leave.days_count}d)`]
      );
    } else {
      const [wfh] = await query<any[]>(
        'SELECT wr.*, u.name FROM wfh_requests wr JOIN users u ON wr.user_id = u.id WHERE wr.id = ? AND wr.company_id = ?',
        [id, companyId]
      );
      if (!wfh) return NextResponse.json({ error: 'WFH request not found' }, { status: 404 });

      await query(
        'UPDATE wfh_requests SET status = ?, decided_by = ?, decided_at = NOW() WHERE id = ?',
        [action, deciderId, id]
      );

      // Log action
      await query(
        `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [companyId, deciderName, `WFH ${action.toLowerCase()}`, action === 'Approved' ? 'teal' : 'rose', `${wfh.name}, WFH for ${new Date(wfh.date).toISOString().split('T')[0]}`]
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
