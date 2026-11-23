import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'coinhr_super_secret_jwt_key_2026_x87!'
);

export type AuthRole = 'super' | 'admin' | 'hr' | 'employee';

export interface AuthUser {
  id: number;
  companyId: number | null;
  companyName?: string | null;
  employeeCode?: string | null;
  name: string;
  email: string;
  role: AuthRole;
  department?: string | null;
  title?: string | null;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    companyId: user.companyId,
    companyName: user.companyName,
    employeeCode: user.employeeCode,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    title: user.title,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: Number(payload.id),
      companyId: payload.companyId !== undefined && payload.companyId !== null ? Number(payload.companyId) : null,
      companyName: (payload.companyName as string) || null,
      employeeCode: (payload.employeeCode as string) || null,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as AuthRole,
      department: (payload.department as string) || null,
      title: (payload.title as string) || null,
    };
  } catch {
    return null;
  }
}
