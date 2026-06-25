// Client-only helper — converts server registration options to ArrayBuffers,
// calls navigator.credentials.create(), and returns the credential in the
// JSON shape that @simplewebauthn/server v13 expects on the backend.
// Dynamically imported in components to keep this SSR-safe.

function b64urlToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function bufferToB64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default async function doPasskeyRegistration(opts: Record<string, unknown>) {
  const options = opts as {
    challenge: string;
    rp: { name: string; id: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: { type: 'public-key'; alg: number }[];
    timeout?: number;
    attestation?: string;
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    excludeCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[];
  };

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: b64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: b64urlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams as PublicKeyCredentialParameters[],
    timeout: options.timeout ?? 60000,
    attestation: (options.attestation ?? 'none') as AttestationConveyancePreference,
    authenticatorSelection: options.authenticatorSelection ?? {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    excludeCredentials: options.excludeCredentials?.map(c => ({
      id: b64urlToBuffer(c.id),
      type: c.type as PublicKeyCredentialType,
      transports: c.transports,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const response   = credential.response as AuthenticatorAttestationResponse;

  let transports: string[] = [];
  try { transports = response.getTransports?.() ?? ['internal']; } catch { transports = ['internal']; }

  return {
    id:    credential.id,
    rawId: bufferToB64url(credential.rawId),
    type:  'public-key' as const,
    response: {
      clientDataJSON:    bufferToB64url(response.clientDataJSON),
      attestationObject: bufferToB64url(response.attestationObject),
      transports,
    },
    clientExtensionResults: credential.getClientExtensionResults() ?? {},
  };
}
