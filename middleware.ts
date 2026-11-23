import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept all protected API routes
  if (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/hr') ||
    pathname.startsWith('/api/employee') ||
    pathname.startsWith('/api/super')
  ) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let token: string | null = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      // Fallback to cookie for existing browser web navigation
      token = request.cookies.get('auth_token')?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Bearer token is missing. Please provide Authorization: Bearer <token>',
          code: 'BEARER_TOKEN_REQUIRED',
        },
        { status: 401 }
      );
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Invalid or expired Bearer token.',
          code: 'TOKEN_INVALID',
        },
        { status: 401 }
      );
    }

    // Role-based authorization guards
    if (pathname.startsWith('/api/super') && user.role !== 'super') {
      return NextResponse.json(
        { error: 'Forbidden: Superadmin access required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (pathname.startsWith('/api/admin') && !['admin', 'super'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (pathname.startsWith('/api/hr') && !['hr', 'admin', 'super'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: HR or Administrator privileges required.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Attach verified user context and guaranteed Bearer header for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('authorization', `Bearer ${token}`);
    requestHeaders.set('x-user-id', String(user.id));
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-email', user.email);
    if (user.companyId) {
      requestHeaders.set('x-company-id', String(user.companyId));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/hr/:path*',
    '/api/employee/:path*',
    '/api/super/:path*',
  ],
};
