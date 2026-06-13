export interface WebAuthnCredential {
  id: string;
  rawId: string;
  type: 'public-key';
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface RegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout?: number;
  attestation?: 'none' | 'direct' | 'indirect';
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: { id: string; type: 'public-key' }[];
}

export interface AuthenticationOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: { id: string; type: 'public-key' }[];
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!navigator.credentials && !!navigator.credentials.create;
}

export function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return Promise.resolve(false);
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

export async function registerCredential(
  options: RegistrationOptions,
): Promise<{ credentialId: string; rawId: string; response: { attestationObject: string; clientDataJSON: string } }> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64ToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: new TextEncoder().encode(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout ?? 60000,
    attestation: options.attestation ?? 'none',
    authenticatorSelection: options.authenticatorSelection ?? {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    excludeCredentials: options.excludeCredentials?.map((c) => ({
      id: base64ToArrayBuffer(c.id),
      type: c.type,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    credentialId: credential.id,
    rawId: arrayBufferToBase64(credential.rawId),
    response: {
      attestationObject: arrayBufferToBase64(response.attestationObject),
      clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
    },
  };
}

export async function authenticateCredential(
  options: AuthenticationOptions,
): Promise<{ credentialId: string; rawId: string; response: { authenticatorData: string; signature: string; clientDataJSON: string; userHandle?: string } }> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64ToArrayBuffer(options.challenge),
    timeout: options.timeout ?? 60000,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials?.map((c) => ({
      id: base64ToArrayBuffer(c.id),
      type: c.type,
    })),
    userVerification: options.userVerification ?? 'required',
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  const response = assertion.response as AuthenticatorAssertionResponse;

  return {
    credentialId: assertion.id,
    rawId: arrayBufferToBase64(assertion.rawId),
    response: {
      authenticatorData: arrayBufferToBase64(response.authenticatorData),
      signature: arrayBufferToBase64(response.signature),
      clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
      userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : undefined,
    },
  };
}
