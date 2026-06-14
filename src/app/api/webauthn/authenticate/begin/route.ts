import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { generateAuthOptions } from '@/lib/webauthn-server';
import { requireAuth } from '@/lib/require-auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const memberId = req.nextUrl.searchParams.get('member_id');

    await execute("DELETE FROM webauthn_challenges WHERE expires_at < now()");

    // Only return credentials for the requested member — never dump all credentials
    if (!memberId) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }

    const creds: any[] = await query(
      'SELECT credential_id FROM webauthn_credentials WHERE member_id = $1',
      [memberId],
    );

    const options = await generateAuthOptions(
      creds.map((c: any) => ({ id: c.credential_id })),
    );

    // Bind challenge to a signed session ID so complete/ can verify it belongs to this flow
    const sessionId = crypto.randomUUID();
    await execute(
      'INSERT INTO webauthn_challenges (challenge, session_id, member_id, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [options.challenge, sessionId, memberId, 'authentication', new Date(Date.now() + 120000).toISOString()],
    );

    const response = NextResponse.json({
      challenge: options.challenge,
      allowCredentials: options.allowCredentials?.map((c) => ({
        id: c.id,
        type: 'public-key',
      })) || [],
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
    });

    // Store session ID in a short-lived httpOnly cookie for the complete step
    response.cookies.set('wa_session', sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 120,
      path: '/api/webauthn/authenticate',
    });

    return response;
  } catch (err: any) {
    console.error('WebAuthn authenticate begin error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
