import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const memberId = req.nextUrl.searchParams.get('member_id');
    if (!memberId) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }
    const creds = await query(
      'SELECT id, credential_id, device_name, created_at, last_used_at FROM webauthn_credentials WHERE member_id = $1 ORDER BY created_at DESC',
      [memberId],
    );
    return NextResponse.json({
      credentials: creds.map((c: any) => ({
        id: c.credential_id,
        deviceName: c.device_name,
        createdAt: c.created_at,
        lastUsedAt: c.last_used_at,
      })),
    });
  } catch (err: any) {
    console.error('List credentials error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
