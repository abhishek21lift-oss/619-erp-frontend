// src/lib/require-auth.ts
// Shared authentication guard for Next.js API routes.
// Verifies the JWT issued by the Express backend using jose (no secret round-trip).
//
// Usage:
//   const auth = await requireAuth(req);
//   if (auth instanceof NextResponse) return auth;   // 401/403 returned early
//   // auth.id, auth.role, auth.branch_id are now available

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

export interface AuthPayload extends JWTPayload {
  id: string;
  role: string;
  branch_id?: string;
  token_version?: number;
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? ''
);

export async function requireAuth(
  req: NextRequest
): Promise<AuthPayload | NextResponse> {
  if (!process.env.JWT_SECRET) {
    console.error('[require-auth] JWT_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const token =
    req.cookies.get('token')?.value ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.id || !payload.role) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }
    return payload as AuthPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

/** Require a specific role; returns 403 if role does not match. */
export async function requireRole(
  req: NextRequest,
  ...roles: string[]
): Promise<AuthPayload | NextResponse> {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!roles.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return auth;
}
