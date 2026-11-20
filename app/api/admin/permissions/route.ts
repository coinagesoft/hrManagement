import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { PERMS } from '@/lib/mock';

const defaultPerms = () =>
  Object.fromEntries(PERMS.map((p) => [p.key, { hr: p.hr, employee: p.employee }]));

export async function GET() {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const [settings] = await query<any[]>(
      'SELECT permissions FROM company_settings WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    let permissions = defaultPerms();
    if (settings?.permissions) {
      try {
        permissions = typeof settings.permissions === 'string'
          ? JSON.parse(settings.permissions)
          : settings.permissions;
      } catch {}
    }

    return NextResponse.json({ success: true, permissions });
  } catch (error: any) {
    console.error('Permissions GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { permissions } = body;

    if (!permissions) {
      return NextResponse.json({ success: false, error: 'Permissions data required' }, { status: 400 });
    }

    const jsonStr = JSON.stringify(permissions);

    await query(`
      INSERT INTO company_settings (company_id, permissions)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_at = NOW()
    `, [companyId, jsonStr]);

    const userName = session?.name || 'Administrator';
    await query(`
      INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
      VALUES (?, ?, ?, 'Permissions updated', 'blue', ?, NOW())
    `, [companyId, session?.id || null, userName, 'Updated role-based access permissions matrix']);

    return NextResponse.json({
      success: true,
      message: 'Access permissions updated and logged successfully',
      permissions,
    });
  } catch (error: any) {
    console.error('Permissions PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
