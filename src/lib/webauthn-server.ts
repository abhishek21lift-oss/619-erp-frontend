import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// H-03: Use explicit env vars — not VERCEL_URL (which is a preview deployment URL,
// not the custom domain, and changes every deploy).
const RP_NAME = '619 ERP';

// Resolve at call time so the guard fires on first request, not at build time.
function getConfig() {
  const rpId  = process.env.WEBAUTHN_RP_ID  ?? 'localhost';
  const origin = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';
  if (process.env.NODE_ENV === 'production' && (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN)) {
    throw new Error('WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN must be set in production');
  }
  return { rpId, origin };
}

export { RP_NAME };

export async function generateRegOptions(user: { id: string; name: string; displayName: string }, excludeCredentials: { id: string }[], allowCrossPlatform?: boolean) {
  const { rpId } = getConfig();
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userName: user.name,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: excludeCredentials.map((c) => ({
      id: c.id,
      transports: ['internal', 'usb', 'nfc', 'ble'],
    })),
    authenticatorSelection: {
      authenticatorAttachment: allowCrossPlatform ? undefined : 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
  });
}

export async function verifyRegResponse(credential: any, expectedChallenge: string) {
  const { rpId, origin } = getConfig();
  return verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });
}

export async function generateAuthOptions(allowCredentials: { id: string }[], requireUserVerification?: boolean) {
  const { rpId } = getConfig();
  return generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: allowCredentials.map((c) => ({
      id: c.id,
      transports: ['internal', 'usb', 'nfc', 'ble'],
    })),
    userVerification: requireUserVerification === false ? 'discouraged' : 'required',
  });
}

export async function verifyAuthResponse(response: any, expectedChallenge: string, credential: any) {
  const { rpId, origin } = getConfig();
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential,
  });
}
