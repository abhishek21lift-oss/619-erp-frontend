// Client-only helper — converts server options to ArrayBuffers and calls
// navigator.credentials.get(). Dynamically imported in auth-context so the
// bundle does not include navigator-dependent code on the server.

function b64urlToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64.replace(/-/g, '+').replace(/\//g, '_').replace(/_/g, '/'));
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

export default async function doPasskeyAuthentication(opts: Record<string, unknown>) {
  const options = opts as {
    challenge: string;
    timeout?: number;
    rpId?: string;
    allowCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[];
    userVerification?: UserVerificationRequirement;
  };

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuffer(options.challenge),
    timeout: options.timeout ?? 60000,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials?.map((c) => ({
      id: b64urlToBuffer(c.id),
      type: c.type as PublicKeyCredentialType,
      transports: c.transports,
    })),
    userVerification: options.userVerification ?? 'required',
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  const response  = assertion.response as AuthenticatorAssertionResponse;

  return {
    id:    assertion.id,
    rawId: bufferToB64url(assertion.rawId),
    type:  'public-key' as const,
    response: {
      clientDataJSON:    bufferToB64url(response.clientDataJSON),
      authenticatorData: bufferToB64url(response.authenticatorData),
      signature:         bufferToB64url(response.signature),
      userHandle:        response.userHandle ? bufferToB64url(response.userHandle) : undefined,
    },
    clientExtensionResults: assertion.getClientExtensionResults() ?? {},
  };
}
