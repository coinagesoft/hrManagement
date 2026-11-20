import { NextResponse, connection } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  await connection();
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Look up user
    const [user] = await query<any[]>(
      'SELECT id, name, email, company_id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    // If user doesn't exist, we still return success for security (prevent email enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that address, a password reset link has been sent.',
      });
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(`
      INSERT INTO password_resets (user_id, email, token, expires_at)
      VALUES (?, ?, ?, ?)
    `, [user.id, cleanEmail, token, expiresAt]);

    // 3. Dispatch Email via Gmail SMTP
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      toEmail: cleanEmail,
      userName: user.name,
      resetLink,
    });

    // 4. Audit Log
    if (user.company_id) {
      await query(`
        INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
        VALUES (?, ?, ?, 'Password reset requested', 'amber', ?, NOW())
      `, [user.company_id, user.id, user.name, `Password reset link requested for ${cleanEmail}`]);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that address, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
  }
}
