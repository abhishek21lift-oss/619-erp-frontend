import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { verifyRegResponse } from '@/lib/webauthn-server';
import { requireAuth } from '@/lib/require-auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { memberId, deviceName, credentialId, rawId, attestationObject, clientDataJSON, transports, deviceType } = body;

    if (!memberId || !deviceName || !credentialId || !attestationObject || !clientDataJSON) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const challengeRow: any = await queryOne(
      "SELECT challenge FROM webauthn_challenges WHERE member_id = $1 AND type = 'registration' AND expires_at > now() ORDER BY created_at DESC LIMIT 1",
      [memberId],
    );
    if (!challengeRow) {
      return NextResponse.json({ error: 'No valid challenge found. Please start enrollment again.' }, { status: 400 });
    }

    const verification = await verifyRegResponse(
      {
        id: credentialId,
        rawId,
        response: { attestationObject, clientDataJSON },
        type: 'public-key',
      },
      challengeRow.challenge,
    );

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
    }

    const publicKey = Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64url');
    const counter = verification.registrationInfo.credential.counter ?? 0;
    const credTransports = Array.isArray(transports) ? JSON.stringify(transports) : '["internal"]';

    await execute(
      `INSERT INTO webauthn_credentials (member_id, credential_id, device_name, device_type, public_key, counter, transports)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (credential_id) DO UPDATE SET device_name = $3, device_type = $4, transports = $7`,
      [memberId, credentialId, deviceName, deviceType || '', publicKey, counter, credTransports],
    );

    await execute('DELETE FROM webauthn_challenges WHERE challenge = $1', [challengeRow.challenge]);

    return NextResponse.json({ success: true, credential: { id: credentialId } });
  } catch (err: any) {
    console.error('WebAuthn register complete error:', err);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
