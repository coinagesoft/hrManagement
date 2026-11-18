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
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        d.id,
        d.company_id,
        d.user_id,
        d.kind,
        d.requested_by,
        d.status,
        d.date,
        d.note,
        d.file_name,
        d.file_url,
        d.created_at,
        u.name AS employee_name,
        u.employee_code,
        u.department AS dept
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.company_id = ?
    `;
    const params: any[] = [companyId];

    if (userId && userId !== 'all') {
      sql += ' AND d.user_id = ?';
      params.push(userId);
    }
    if (status && status !== 'all') {
      sql += ' AND d.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY d.id DESC';

    const rows = await query<any[]>(sql, params);

    const documents = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      dept: r.dept,
      kind: r.kind,
      by: r.requested_by,
      status: r.status,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
      note: r.note,
      fileName: r.file_name,
      fileUrl: r.file_url,
    }));

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { userId, kind, note } = body;

    if (!userId || !kind) {
      return NextResponse.json({ success: false, error: 'User and document kind are required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const requestedBy = session?.role === 'admin' ? 'admin' : session?.role === 'employee' ? 'employee' : 'hr';
    const status = requestedBy === 'employee' ? 'Pending' : 'Requested';

    const result = await query<any>(`
      INSERT INTO documents (company_id, user_id, kind, requested_by, status, date, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [companyId, userId, kind, requestedBy, status, todayStr, note || null]);

    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, target_type, target_id, details)
       VALUES (?, ?, 'request_document', 'document', ?, ?)`,
      [companyId, session?.id || 1, result.insertId, `Requested ${kind} from user ID ${userId}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Document request created',
      id: result.insertId,
    });
  } catch (error: any) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { id, status, fileName, fileUrl } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (fileName !== undefined) {
      updates.push('file_name = ?');
      params.push(fileName);
    }
    if (fileUrl !== undefined) {
      updates.push('file_url = ?');
      params.push(fileUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    params.push(id, companyId);
    await query(`
      UPDATE documents 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ? AND company_id = ?
    `, params);

    return NextResponse.json({ success: true, message: 'Document updated successfully' });
  } catch (error: any) {
    console.error('Documents PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    await query('DELETE FROM documents WHERE id = ? AND company_id = ?', [id, companyId]);

    return NextResponse.json({ success: true, message: 'Document request deleted' });
  } catch (error: any) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
