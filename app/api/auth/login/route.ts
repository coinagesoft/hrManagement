import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyPassword, createSessionToken, type AuthUser, type AuthRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query user and company info from DB
    const users = await query<any[]>(
      `SELECT u.*, c.name AS company_name, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE LOWER(u.email) = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check pending user status
    if (user.status === 'Pending') {
      return NextResponse.json(
        { error: 'Your account is pending activation. Please check your invitation email to set your password and activate your company.' },
        { status: 403 }
      );
    }

    if (user.status === 'Inactive') {
      return NextResponse.json(
        { error: 'Your user account is inactive. Please contact your company administrator.' },
        { status: 403 }
      );
    }

    // Check company status for non-super users
    if (user.role !== 'super') {
      if (user.company_status === 'Pending') {
        return NextResponse.json(
          { error: 'This company workspace is pending administrator activation. Please open the invitation link to set your password.' },
          { status: 403 }
        );
      }
      if (user.company_status === 'Suspended') {
        return NextResponse.json(
          { error: 'Your organization access is currently suspended. Please contact platform support.' },
          { status: 403 }
        );
      }
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      companyId: user.company_id,
      companyName: user.company_name || null,
      employeeCode: user.employee_code || null,
      name: user.name,
      email: user.email,
      role: user.role as AuthRole,
      department: user.department || null,
      title: user.title || null,
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
      user: authUser,
      redirectTo: `/${authUser.role}`,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please check database connection.' },
      { status: 500 }
    );
  }
}
