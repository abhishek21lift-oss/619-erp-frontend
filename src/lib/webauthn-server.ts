import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// H-03: Use explicit env vars — not VERCEL_URL (which is a preview deployment URL,
// not the custom domain, and changes every deploy).
const RP_NAME = '619 ERP';
const RP_ID   = process.env.WEBAUTHN_RP_ID   ?? 'localhost';
const ORIGIN  = process.env.WEBAUTHN_ORIGIN  ?? 'http://localhost:3000';

if (process.env.NODE_ENV === 'production' && (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN)) {
  throw new Error('WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN must be set in production');
}

export { RP_NAME, RP_ID, ORIGIN };

export async function generateRegOptions(user: { id: string; name: string; displayName: string }, excludeCredentials: { id: string }[], allowCrossPlatform?: boolean) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
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
  return verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
}

export async function generateAuthOptions(allowCredentials: { id: string }[], requireUserVerification?: boolean) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: allowCredentials.map((c) => ({
      id: c.id,
      transports: ['internal', 'usb', 'nfc', 'ble'],
    })),
    userVerification: requireUserVerification === false ? 'discouraged' : 'required',
  });
}

export async function verifyAuthResponse(response: any, expectedChallenge: string, credential: any) {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential,
  });
}
