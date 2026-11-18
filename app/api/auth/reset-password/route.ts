import { NextResponse, connection } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  await connection();
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is missing' }, { status: 400 });
    }

    const [record] = await query<any[]>(`
      SELECT id, user_id, email, expires_at, used
      FROM password_resets
      WHERE token = ? LIMIT 1
    `, [token]);

    if (!record) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired token.' }, { status: 404 });
    }

    if (record.used) {
      return NextResponse.json({ valid: false, error: 'This password reset link has already been used.' }, { status: 400 });
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ valid: false, error: 'This password reset link has expired.' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      email: record.email,
    });
  } catch (error: any) {
    console.error('Verify reset token error:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const [record] = await query<any[]>(`
      SELECT id, user_id, email, expires_at, used
      FROM password_resets
      WHERE token = ? LIMIT 1
    `, [token]);

    if (!record || record.used || new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: 'Invalid, used, or expired token.' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
      hashedPassword,
      record.user_id,
    ]);

    // Mark reset record as used
    await query('UPDATE password_resets SET used = TRUE WHERE id = ?', [record.id]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
