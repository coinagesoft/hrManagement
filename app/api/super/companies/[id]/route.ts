import { NextResponse, connection } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await params;
    const companyId = Number(id);

    const companies = await query<any[]>(
      `SELECT c.*, COUNT(u.id) as user_count 
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       WHERE c.id = ?
       GROUP BY c.id
       LIMIT 1`,
      [companyId]
    );

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = companies[0];

    // Fetch users for this company
    const users = await query<any[]>(
      `SELECT id, employee_code, name, email, role, department, title, phone, status, joined_date
       FROM users
       WHERE company_id = ?
       ORDER BY id ASC`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      company: {
        id: String(company.id),
        name: company.name,
        code: company.code,
        admin: company.admin_name,
        email: company.email,
        status: company.status,
        users: Number(company.user_count || 0),
        created: company.created_at ? new Date(company.created_at).toISOString().split('T')[0] : null,
      },
      employees: users,
    });
  } catch (error: any) {
    console.error('Fetch company error:', error);
    return NextResponse.json({ error: 'Failed to retrieve company details' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = Number(id);
    const body = await request.json();

    // Check existing company
    const existing = await query<any[]>(
      'SELECT id, name, status, admin_name FROM companies WHERE id = ? LIMIT 1',
      [companyId]
    );
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const current = existing[0];
    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined && ['Active', 'Suspended'].includes(body.status)) {
      updates.push('status = ?');
      values.push(body.status);

      // Log status transition
      const tone = body.status === 'Active' ? 'green' : 'rose';
      const action = body.status === 'Active' ? 'Company reactivated' : 'Company suspended';
      const detail = `${current.name} access ${body.status === 'Active' ? 'restored' : 'paused'}`;

      await query(
        `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
         VALUES (?, 'Platform Owner', ?, ?, ?, NOW())`,
        [companyId, action, tone, detail]
      );
    }

    if (body.name !== undefined && body.name.trim()) {
      updates.push('name = ?');
      values.push(body.name.trim());
    }

    if (body.admin !== undefined && body.admin.trim()) {
      updates.push('admin_name = ?');
      values.push(body.admin.trim());
    }

    if (body.email !== undefined && body.email.trim()) {
      updates.push('email = ?');
      values.push(body.email.trim().toLowerCase());
    }

    if (body.code !== undefined && body.code.trim()) {
      updates.push('code = ?');
      values.push(body.code.trim().toUpperCase());
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    values.push(companyId);
    await query(`UPDATE companies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    // Fetch updated company
    const [updated] = await query<any[]>(
      `SELECT c.id, c.name, c.code, c.admin_name as admin, c.email, c.status, c.created_at,
              COUNT(u.id) as users
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       WHERE c.id = ?
       GROUP BY c.id`,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      company: {
        id: String(updated.id),
        name: updated.name,
        code: updated.code,
        admin: updated.admin,
        email: updated.email,
        status: updated.status,
        users: Number(updated.users || 0),
        created: updated.created_at ? new Date(updated.created_at).toISOString().split('T')[0] : null,
      },
    });
  } catch (error: any) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = Number(id);

    const existing = await query<any[]>(
      'SELECT id, name FROM companies WHERE id = ? LIMIT 1',
      [companyId]
    );
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const compName = existing[0].name;

    // Remove users and company
    await query('DELETE FROM users WHERE company_id = ?', [companyId]);
    await query('DELETE FROM companies WHERE id = ?', [companyId]);

    // Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
       VALUES (NULL, 'Platform Owner', 'Company deleted', 'rose', ?, NOW())`,
      [`${compName} and its associated accounts were removed`]
    );

    return NextResponse.json({
      success: true,
      message: `Company ${compName} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
