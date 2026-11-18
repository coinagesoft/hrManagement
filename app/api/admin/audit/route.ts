import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const action = searchParams.get('action') || 'All';

    let sql = `
      SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.name AS who
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.company_id = ?
    `;
    const params: any[] = [companyId];

    if (q) {
      sql += ' AND (LOWER(a.details) LIKE ? OR LOWER(a.action) LIKE ? OR LOWER(COALESCE(u.name, "")) LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (action && action !== 'All') {
      sql += ' AND a.action = ?';
      params.push(action);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT 100';

    const rows = await query<any[]>(sql, params);

    const logs = rows.map((r) => {
      const d = r.created_at ? new Date(r.created_at) : new Date();
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return {
        id: r.id,
        t: `${dateStr}, ${timeStr}`,
        who: r.who || 'System / Admin',
        action: r.action,
        tone: r.action.includes('delete') || r.action.includes('reject') ? 'rose' : r.action.includes('create') || r.action.includes('approved') ? 'green' : 'blue',
        detail: r.details || `${r.action} on ${r.target_type}`,
      };
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Company audit fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
