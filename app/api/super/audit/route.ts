import { NextResponse, connection } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const action = searchParams.get('action') || 'All';

    let sql = `
      SELECT id, user_name AS who, action, tone, detail, created_at
      FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += ` AND (LOWER(detail) LIKE ? OR LOWER(action) LIKE ? OR LOWER(user_name) LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (action && action !== 'All') {
      sql += ` AND action = ?`;
      params.push(action);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const rows = await query<any[]>(sql, params);

    const logs = rows.map((r) => {
      const d = r.created_at ? new Date(r.created_at) : new Date();
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return {
        id: r.id,
        t: `${dateStr}, ${timeStr}`,
        who: r.who || 'Platform Owner',
        action: r.action,
        tone: r.tone || 'blue',
        detail: r.detail || '',
      };
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Super audit fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tone, detail, companyId, who } = body;

    if (!action || !detail) {
      return NextResponse.json({ error: 'Action and detail are required.' }, { status: 400 });
    }

    await query(
      `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [companyId || null, who || 'Platform Owner', action, tone || 'blue', detail]
    );

    return NextResponse.json({ success: true, message: 'Audit entry created' });
  } catch (error: any) {
    console.error('Create audit log error:', error);
    return NextResponse.json({ error: 'Failed to record audit entry' }, { status: 500 });
  }
}
