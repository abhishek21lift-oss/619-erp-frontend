import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { verifyAuthResponse } from '@/lib/webauthn-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { credentialId, rawId, authenticatorData, signature, clientDataJSON, userHandle } = body;

    if (!credentialId || !rawId || !authenticatorData || !signature || !clientDataJSON) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const challengeRow: any = await queryOne(
      "SELECT challenge FROM webauthn_challenges WHERE type = 'authentication' AND expires_at > now() ORDER BY created_at DESC LIMIT 1",
    );
    if (!challengeRow) {
      return NextResponse.json({ error: 'No valid challenge found. Please try again.' }, { status: 400 });
    }

    const credRow: any = await queryOne(
      'SELECT credential_id, public_key, member_id, member_name FROM webauthn_credentials WHERE credential_id = $1',
      [credentialId],
    );
    if (!credRow) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
    }

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
        counter: 0,
        transports: ['internal'],
      },
    );

    if (!verification.verified) {
      return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
    }

    await execute('UPDATE webauthn_credentials SET last_used_at = now() WHERE credential_id = $1', [credentialId]);
    await execute('DELETE FROM webauthn_challenges WHERE challenge = $1', [challengeRow.challenge]);

    return NextResponse.json({
      success: true,
      memberId: credRow.member_id,
      memberName: credRow.member_name || undefined,
    });
  } catch (err: any) {
    console.error('WebAuthn authenticate complete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
