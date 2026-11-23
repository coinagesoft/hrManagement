import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { hashPassword, createSessionToken, type AuthUser, type AuthRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, role, department, title, phone } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanRole: AuthRole = ['admin', 'hr', 'employee'].includes(role) ? role : 'employee';
    const cleanCompany = (companyName || '').trim() || 'Acme Technologies';

    // Check if user email already exists
    const existing = await query<any[]>(
      'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // Resolve company
    let targetCompanyId: number;
    let finalCompanyName: string = cleanCompany;

    const existingCompanies = await query<any[]>(
      'SELECT id, name FROM companies WHERE LOWER(name) = ? LIMIT 1',
      [cleanCompany.toLowerCase()]
    );

    if (existingCompanies && existingCompanies.length > 0) {
      targetCompanyId = existingCompanies[0].id;
      finalCompanyName = existingCompanies[0].name;
    } else {
      // Create company
      const code = cleanCompany.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ORG';
      const compResult = await query<any>(
        'INSERT INTO companies (name, code, email, admin_name, status) VALUES (?, ?, ?, ?, ?)',
        [cleanCompany, code, cleanEmail, cleanName, 'Active']
      );
      targetCompanyId = compResult.insertId;
    }

    // Generate unique employee code
    const countResult = await query<any[]>(
      'SELECT COUNT(*) as cnt FROM users WHERE company_id = ?',
      [targetCompanyId]
    );
    const nextNum = (countResult[0]?.cnt || 0) + 1;
    const empCode = `EMP-${String(nextNum).padStart(3, '0')}`;

    // Hash password
    const hashed = await hashPassword(password);

    // Insert user
    const insertResult = await query<any>(
      `INSERT INTO users 
       (company_id, employee_code, name, email, password, role, department, title, phone, status, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', CURDATE())`,
      [
        targetCompanyId,
        empCode,
        cleanName,
        cleanEmail,
        hashed,
        cleanRole,
        department || 'General',
        title || (cleanRole === 'admin' ? 'Owner / Administrator' : cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
        phone || null,
      ]
    );

    const newUserId = insertResult.insertId;

    const authUser: AuthUser = {
      id: newUserId,
      companyId: targetCompanyId,
      companyName: finalCompanyName,
      employeeCode: empCode,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      department: department || 'General',
      title: title || (cleanRole === 'admin' ? 'Owner / Administrator' : cleanRole === 'hr' ? 'HR Specialist' : 'Team Member'),
    };

    const token = await createSessionToken(authUser);

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: authUser,
      redirectTo: `/${authUser.role}`,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
