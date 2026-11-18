import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET() {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const rows = await query<any[]>(
      `SELECT id, name, date, kind, created_at
       FROM holidays
       WHERE company_id = ? OR company_id IS NULL
       ORDER BY date ASC`,
      [companyId]
    );

    const holidays = rows.map((h) => ({
      id: String(h.id),
      name: h.name,
      date: new Date(h.date).toISOString().split('T')[0],
      kind: h.kind as 'Public' | 'Company',
    }));

    return NextResponse.json({ success: true, holidays });
  } catch (error: any) {
    console.error('Holidays fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { name, date, kind } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Holiday name and date are required.' }, { status: 400 });
    }

    const res = await query<any>(
      'INSERT INTO holidays (company_id, name, date, kind, created_at) VALUES (?, ?, ?, ?, NOW())',
      [companyId, name.trim(), date, kind || 'Company']
    );

    return NextResponse.json({
      success: true,
      holiday: {
        id: String(res.insertId),
        name: name.trim(),
        date,
        kind: kind || 'Company',
      },
      message: 'Holiday added successfully.',
    });
  } catch (error: any) {
    console.error('Add holiday error:', error);
    return NextResponse.json({ error: 'Failed to add holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required.' }, { status: 400 });
    }

    await query('DELETE FROM holidays WHERE id = ? AND (company_id = ? OR company_id IS NULL)', [id, companyId]);

    return NextResponse.json({ success: true, message: 'Holiday removed.' });
  } catch (error: any) {
    console.error('Delete holiday error:', error);
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
