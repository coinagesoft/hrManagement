import { NextResponse, connection } from 'next/server';
import crypto from 'crypto';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendEmployeeInvitationEmail } from '@/lib/email';
import { getCompanyInvitationAttachments } from '@/lib/invitation-docs';

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
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const dept = searchParams.get('dept') || 'All';
    const status = searchParams.get('status') || 'All';

    let sql = `
      SELECT id, company_id, employee_code, name, email, phone, role, department, title, status, joined_date, created_at,
             (SELECT token FROM invitations WHERE user_id = users.id AND status = 'Pending' ORDER BY id DESC LIMIT 1) AS invite_token
      FROM users
      WHERE company_id = ?
    `;
    const params: any[] = [companyId];

    if (q) {
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(employee_code, '')) LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (dept && dept !== 'All') {
      sql += ` AND department = ?`;
      params.push(dept);
    }

    if (status && status !== 'All') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY id ASC`;

    const rows = await query<any[]>(sql, params);

    const employees = rows.map((u) => ({
      id: String(u.id),
      code: u.employee_code || `EMP-${String(u.id).padStart(3, '0')}`,
      name: u.name,
      email: u.email,
      phone: u.phone || '-',
      dept: u.department || 'General',
      title: u.title || (u.role === 'admin' ? 'Administrator' : u.role === 'hr' ? 'HR Manager' : 'Team Member'),
      role: (u.role || 'employee').toUpperCase() as 'ADMIN' | 'HR' | 'EMPLOYEE',
      status: u.status as 'Active' | 'Inactive' | 'Pending',
      inviteToken: u.invite_token || null,
      joined: u.joined_date ? new Date(u.joined_date).toISOString().split('T')[0] : '2026-01-01',
    }));

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error('Admin employees list error:', error);
    return NextResponse.json({ error: 'Failed to retrieve employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { name, email, phone, dept, title, role, joined } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanRole = (role || 'employee').toLowerCase();

    // Check duplicate email
    const existing = await query<any[]>(
      'SELECT id, name, email, employee_code, role, department, title, phone, status, company_id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    // Resolve app origin for invitation link
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    // Get company details for employee ID & invitation email
    const compRows = await query<any[]>('SELECT id, name, code FROM companies WHERE id = ?', [companyId]);
    const comp = compRows[0];
    const companyName = comp?.name || 'Company';
    const codePrefix = comp?.code || 'EMP';

    if (existing.length > 0) {
      const existingUser = existing[0];

      // Case A: User is in the SAME company and in Pending status
      // Automatically refresh invitation token and re-dispatch the activation email
      if (existingUser.company_id === companyId && existingUser.status === 'Pending') {
        // Update user fields in case they changed
        await query(
          `UPDATE users 
           SET name = ?, role = ?, department = ?, title = ?, phone = ?, joined_date = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            cleanName,
            cleanRole,
            dept || existingUser.department || 'Engineering',
            title || existingUser.title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
            phone || existingUser.phone || null,
            joined || new Date().toISOString().split('T')[0],
            existingUser.id,
          ]
        );

        // Expire old invitations
        await query(
          "UPDATE invitations SET status = 'Expired' WHERE user_id = ? AND status = 'Pending'",
          [existingUser.id]
        );

        // Generate fresh token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        await query(
          `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
          [companyId, existingUser.id, cleanEmail, inviteToken, cleanRole]
        );

        const inviteLink = `${origin}/accept-invite?token=${inviteToken}`;

        // Re-dispatch email with invitation documents attached
        const attachments = await getCompanyInvitationAttachments(companyId);
        await sendEmployeeInvitationEmail({
          toEmail: cleanEmail,
          employeeName: cleanName,
          companyName,
          role: cleanRole,
          department: dept,
          inviteLink,
          attachments,
        });

        await query(
          `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
           VALUES (?, ?, ?, 'Invite resent', 'blue', ?, NOW())`,
          [companyId, existingUser.id, cleanName, `Refreshed pending profile and resent invitation to ${cleanEmail}`]
        );

        return NextResponse.json({
          success: true,
          employee: {
            id: String(existingUser.id),
            code: existingUser.employee_code,
            name: cleanName,
            email: cleanEmail,
            phone: phone || existingUser.phone || '-',
            dept: dept || existingUser.department || 'Engineering',
            title: title || existingUser.title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
            role: cleanRole.toUpperCase(),
            status: 'Pending',
            inviteToken,
            joined: joined || new Date().toISOString().split('T')[0],
          },
          inviteLink,
          message: `${cleanRole === 'hr' ? 'HR user' : 'Employee'} was already pending activation. A fresh invitation email has been resent to ${cleanEmail}!`,
        });
      }

      // Case B: User is in the SAME company but currently Inactive
      // Reactivate them and send fresh invite
      if (existingUser.company_id === companyId && existingUser.status === 'Inactive') {
        const tempRandomPw = crypto.randomBytes(24).toString('hex');
        const tempPwHash = await hashPassword(tempRandomPw);

        await query(
          `UPDATE users 
           SET name = ?, password = ?, role = ?, department = ?, title = ?, phone = ?, status = 'Pending', updated_at = NOW()
           WHERE id = ?`,
          [
            cleanName,
            tempPwHash,
            cleanRole,
            dept || existingUser.department || 'Engineering',
            title || existingUser.title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
            phone || existingUser.phone || null,
            existingUser.id,
          ]
        );

        const inviteToken = crypto.randomBytes(32).toString('hex');
        await query(
          `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
          [companyId, existingUser.id, cleanEmail, inviteToken, cleanRole]
        );

        const inviteLink = `${origin}/accept-invite?token=${inviteToken}`;

        const attachments = await getCompanyInvitationAttachments(companyId);
        await sendEmployeeInvitationEmail({
          toEmail: cleanEmail,
          employeeName: cleanName,
          companyName,
          role: cleanRole,
          department: dept,
          inviteLink,
          attachments,
        });

        await query(
          `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
           VALUES (?, ?, ?, 'Employee reactivated', 'green', ?, NOW())`,
          [companyId, existingUser.id, cleanName, `Reactivated ${cleanName} (${cleanEmail}) and sent new invitation link`]
        );

        return NextResponse.json({
          success: true,
          employee: {
            id: String(existingUser.id),
            code: existingUser.employee_code,
            name: cleanName,
            email: cleanEmail,
            phone: phone || existingUser.phone || '-',
            dept: dept || existingUser.department || 'Engineering',
            title: title || existingUser.title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
            role: cleanRole.toUpperCase(),
            status: 'Pending',
            inviteToken,
            joined: joined || new Date().toISOString().split('T')[0],
          },
          inviteLink,
          message: `Previously inactive employee ${cleanName} has been reactivated and a fresh invitation email was sent to ${cleanEmail}!`,
        });
      }

      // Case C: User is in the SAME company and already Active
      if (existingUser.company_id === companyId) {
        return NextResponse.json(
          {
            error: `An active account already exists for ${existingUser.name} (${cleanEmail}) as ${existingUser.role?.toUpperCase()}. You can edit their profile directly in the roster table.`,
          },
          { status: 409 }
        );
      }

      // Case D: Email belongs to another organization
      return NextResponse.json(
        {
          error: `The email address ${cleanEmail} is already registered under another account in the system. Please use a unique work email.`,
        },
        { status: 409 }
      );
    }

    const countRows = await query<any[]>('SELECT COUNT(*) as cnt FROM users WHERE company_id = ?', [companyId]);
    const empCode = `${codePrefix}-${String((countRows[0]?.cnt || 0) + 1).padStart(3, '0')}`;

    // Set a cryptographically secure random temporary password hash until user activates and sets their own
    const tempRandomPw = crypto.randomBytes(24).toString('hex');
    const tempPwHash = await hashPassword(tempRandomPw);

    const insertRes = await query<any>(
      `INSERT INTO users 
       (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW())`,
      [
        companyId,
        empCode,
        cleanName,
        cleanEmail,
        tempPwHash,
        cleanRole,
        dept || 'Engineering',
        title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
        phone || null,
        joined || new Date().toISOString().split('T')[0],
      ]
    );

    const newId = insertRes.insertId;

    // Generate fresh invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Store in invitations table with 7 day expiry
    await query(
      `INSERT INTO invitations (company_id, user_id, email, token, role, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [companyId, newId, cleanEmail, inviteToken, cleanRole]
    );

    const inviteLink = `${origin}/accept-invite?token=${inviteToken}`;

    // Dispatch invitation email with active company onboarding documents attached
    const attachments = await getCompanyInvitationAttachments(companyId);
    const mailRes = await sendEmployeeInvitationEmail({
      toEmail: cleanEmail,
      employeeName: cleanName,
      companyName,
      role: cleanRole,
      department: dept,
      inviteLink,
      attachments,
    });

    // Record audit log
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Employee invited', 'blue', ?, NOW())`,
      [companyId, newId, cleanName, `Added ${cleanName} (${cleanEmail}) as ${cleanRole}. Invitation email dispatched.`]
    );

    return NextResponse.json({
      success: true,
      employee: {
        id: String(newId),
        code: empCode,
        name: cleanName,
        email: cleanEmail,
        phone: phone || '-',
        dept: dept || 'Engineering',
        title: title || (cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
        role: cleanRole.toUpperCase(),
        status: 'Pending',
        inviteToken,
        joined: joined || new Date().toISOString().split('T')[0],
      },
      inviteLink,
      emailSent: mailRes.success,
      message: `${cleanRole === 'hr' ? 'HR user' : 'Employee'} added successfully! An activation email was sent to ${cleanEmail}.`,
    });
  } catch (error: any) {
    console.error('Admin add employee error:', error);
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { id, name, email, phone, dept, title, role, status, joined } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name.trim()); }
    if (email) { updates.push('email = ?'); values.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (dept) { updates.push('department = ?'); values.push(dept); }
    if (title) { updates.push('title = ?'); values.push(title); }
    if (role) { updates.push('role = ?'); values.push(role.toLowerCase()); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (joined) { updates.push('joined_date = ?'); values.push(joined); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    values.push(Number(id), companyId);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND company_id = ?`, values);

    return NextResponse.json({ success: true, message: 'Employee updated successfully.' });
  } catch (error: any) {
    console.error('Admin update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const companyId = await resolveCompanyId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required.' }, { status: 400 });
    }

    // Soft deactivate instead of hard delete
    await query(
      "UPDATE users SET status = 'Inactive', updated_at = NOW() WHERE id = ? AND company_id = ?",
      [Number(id), companyId]
    );

    return NextResponse.json({ success: true, message: 'Employee deactivated successfully.' });
  } catch (error: any) {
    console.error('Admin deactivate employee error:', error);
    return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 });
  }
}
