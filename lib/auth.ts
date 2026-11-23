import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AuthRole,
  AuthUser,
  createSessionToken,
  verifySessionToken,
} from './jwt';

export type { AuthRole, AuthUser };
export { createSessionToken, verifySessionToken };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extracts the Bearer token from incoming request headers, Next.js server headers, or cookie fallback.
 */
export async function extractBearerToken(req?: Request | Headers): Promise<string | null> {
  // 1. From passed Request or Headers parameter
  if (req) {
    if ('headers' in req && req.headers && typeof (req.headers as Headers).get === 'function') {
      const authHeader = (req.headers as Headers).get('authorization') || (req.headers as Headers).get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
      }
    } else if (typeof (req as Headers).get === 'function') {
      const authHeader = (req as Headers).get('authorization') || (req as Headers).get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
      }
    }
  }

  // 2. From Next.js headers() server context
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization') || headerList.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }
  } catch {}

  // 3. Fallback to auth_token cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) return token;
  } catch {}

  return null;
}

/**
 * Retrieves and validates the authenticated user from the Bearer token (or session cookie).
 */
export async function getSessionUser(req?: Request | Headers): Promise<AuthUser | null> {
  const token = await extractBearerToken(req);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Strictly verifies Bearer token authentication and optional role restrictions.
 * Returns { user } if valid, or { errorResponse } with 401/403.
 */
export async function requireAuth(
  req?: Request,
  allowedRoles?: AuthRole[]
): Promise<
  | { user: AuthUser; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse }
> {
  const user = await getSessionUser(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'Unauthorized: Valid Bearer token required. Please include "Authorization: Bearer <token>" header.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Forbidden: Access requires ${allowedRoles.join(' or ')} privileges.`,
          code: 'FORBIDDEN',
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
