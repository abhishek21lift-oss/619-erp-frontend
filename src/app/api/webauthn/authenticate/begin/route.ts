import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { generateAuthOptions } from '@/lib/webauthn-server';

export async function GET(req: NextRequest) {
  try {
    const memberId = req.nextUrl.searchParams.get('member_id');

    await execute("DELETE FROM webauthn_challenges WHERE expires_at < now()");

    let creds: any[];
    if (memberId) {
      creds = await query(
        'SELECT credential_id FROM webauthn_credentials WHERE member_id = $1',
        [memberId],
      );
    } else {
      creds = await query('SELECT credential_id FROM webauthn_credentials');
    }

    const options = await generateAuthOptions(
      creds.map((c: any) => ({ id: c.credential_id })),
    );

    const challenge = options.challenge;
    await execute(
      'INSERT INTO webauthn_challenges (challenge, member_id, type, expires_at) VALUES ($1, $2, $3, $4)',
      [challenge, memberId || null, 'authentication', new Date(Date.now() + 120000).toISOString()],
    );

    return NextResponse.json({
      challenge: options.challenge,
      allowCredentials: options.allowCredentials?.map((c) => ({
        id: c.id,
        type: 'public-key',
      })) || [],
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification,
    });
  } catch (err: any) {
    console.error('WebAuthn authenticate begin error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
