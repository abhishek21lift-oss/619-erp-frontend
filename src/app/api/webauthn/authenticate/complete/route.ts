import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { verifyAuthResponse } from '@/lib/webauthn-server';
import { requireAuth } from '@/lib/require-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { credentialId, rawId, authenticatorData, signature, clientDataJSON, userHandle } = body;

    if (!credentialId || !rawId || !authenticatorData || !signature || !clientDataJSON) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Retrieve challenge scoped to this session (C-04 fix: session-bound challenge)
    const sessionId = req.cookies.get('wa_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'No WebAuthn session found. Please restart authentication.' }, { status: 400 });
    }

    const challengeRow: any = await queryOne(
      "SELECT challenge FROM webauthn_challenges WHERE session_id = $1 AND type = 'authentication' AND expires_at > now()",
      [sessionId],
    );
    if (!challengeRow) {
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 400 });
    }

    const credRow: any = await queryOne(
      'SELECT credential_id, public_key, counter, member_id, member_name FROM webauthn_credentials WHERE credential_id = $1',
      [credentialId],
    );
    if (!credRow) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
    }

    const transports = credRow.transports ? JSON.parse(credRow.transports) : ['internal'];

    const verification = await verifyAuthResponse(
      {
        id: credentialId,
        rawId,
        response: { authenticatorData, signature, clientDataJSON, userHandle },
        type: 'public-key',
      },
      challengeRow.challenge,
      {
        id: credRow.credential_id,
        publicKey: new Uint8Array(Buffer.from(credRow.public_key, 'base64url')),
        counter: Number(credRow.counter) || 0,
        transports,
      },
    );

    if (!verification.verified) {
      return NextResponse.json({ error: 'Identity verification failed. Please try again.' }, { status: 400 });
    }

    if (verification.authenticationInfo) {
      const newCounter = verification.authenticationInfo.newCounter;
      if (newCounter > 0) {
        await execute('UPDATE webauthn_credentials SET counter = $1, last_used_at = now() WHERE credential_id = $2',
          [newCounter, credentialId]);
      } else {
        await execute('UPDATE webauthn_credentials SET last_used_at = now() WHERE credential_id = $1', [credentialId]);
      }
    }

    // Consume challenge and session cookie
    await execute('DELETE FROM webauthn_challenges WHERE challenge = $1', [challengeRow.challenge]);

    const response = NextResponse.json({
      success: true,
      memberId: credRow.member_id,
      memberName: credRow.member_name || undefined,
    });
    response.cookies.delete('wa_session');
    return response;
  } catch (err: any) {
    console.error('WebAuthn authenticate complete error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
