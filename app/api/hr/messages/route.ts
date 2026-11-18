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
    const threadId = searchParams.get('threadId');

    // 1. Fetch available recipients (all active staff and employees in this company)
    const users = await query<any[]>(`
      SELECT id, employee_code, name, role, department, title
      FROM users
      WHERE company_id = ? AND status = 'Active' AND role != 'super'
      ORDER BY name ASC
    `, [companyId]);

    // 2. Fetch distinct threads and their latest message
    const threadSummaries = await query<any[]>(`
      SELECT 
        m.thread_id,
        m.sender_id,
        m.sender_role,
        m.text,
        m.is_note,
        m.created_at,
        u.name AS sender_name
      FROM messages m
      JOIN (
        SELECT thread_id, MAX(id) AS max_id
        FROM messages
        WHERE company_id = ?
        GROUP BY thread_id
      ) latest ON m.id = latest.max_id
      LEFT JOIN users u ON m.sender_id = u.id
      ORDER BY m.created_at DESC
    `, [companyId]);

    // 3. Fetch messages for active thread (if specified, or default to first thread)
    const targetThread = threadId || threadSummaries[0]?.thread_id || null;
    let messages: any[] = [];

    if (targetThread) {
      const rows = await query<any[]>(`
        SELECT 
          m.id,
          m.thread_id,
          m.sender_id,
          m.sender_role,
          m.text,
          m.is_note,
          m.created_at,
          u.name AS sender_name,
          u.employee_code
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.company_id = ? AND m.thread_id = ?
        ORDER BY m.id ASC
      `, [companyId, targetThread]);

      messages = rows.map((r) => ({
        id: r.id,
        threadId: r.thread_id,
        senderId: r.sender_id,
        senderRole: r.sender_role,
        senderName: r.sender_name || 'System',
        employeeCode: r.employee_code,
        text: r.text,
        isNote: Boolean(r.is_note),
        createdAt: r.created_at,
      }));
    }

    return NextResponse.json({
      success: true,
      currentUser: session ? { id: session.id, role: session.role, name: session.name } : null,
      users,
      threads: threadSummaries.map((t) => ({
        threadId: t.thread_id,
        senderName: t.sender_name,
        lastText: t.text,
        createdAt: t.created_at,
      })),
      activeThread: targetThread,
      messages,
    });
  } catch (error: any) {
    console.error('Messages GET error:', error);
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
    const { threadId, text, isNote = false } = body;

    if (!threadId || !text?.trim()) {
      return NextResponse.json({ success: false, error: 'Thread ID and message text are required' }, { status: 400 });
    }

    const senderId = session?.id || 1;
    const senderRole = session?.role || 'hr';

    const result = await query<any>(`
      INSERT INTO messages (company_id, thread_id, sender_id, sender_role, text, is_note)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [companyId, threadId, senderId, senderRole, text.trim(), isNote ? 1 : 0]);

    return NextResponse.json({
      success: true,
      messageId: result.insertId,
      message: 'Message sent',
    });
  } catch (error: any) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
