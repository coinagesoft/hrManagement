import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const types = await query<any[]>(
      'SELECT id, name, type, is_active FROM salary_component_types WHERE company_id = ? ORDER BY type DESC, id ASC',
      [companyId]
    );

    return NextResponse.json({ success: true, types });
  } catch (error: any) {
    console.error('Salary component types GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { name, type = 'earning' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Component type name is required' }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const cleanType = type === 'deduction' ? 'deduction' : 'earning';

    const result = await query<any>(
      'INSERT INTO salary_component_types (company_id, name, type, is_active) VALUES (?, ?, ?, 1)',
      [companyId, cleanName, cleanType]
    );

    return NextResponse.json({
      success: true,
      message: 'Salary component type added successfully',
      type: {
        id: result.insertId,
        name: cleanName,
        type: cleanType,
        is_active: 1,
      },
    });
  } catch (error: any) {
    console.error('Salary component types POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Component type ID is required' }, { status: 400 });
    }

    await query('DELETE FROM salary_component_types WHERE id = ? AND company_id = ?', [id, companyId]);

    return NextResponse.json({ success: true, message: 'Salary component type deleted' });
  } catch (error: any) {
    console.error('Salary component types DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
