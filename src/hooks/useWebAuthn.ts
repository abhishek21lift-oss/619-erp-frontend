'use client';
import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

// ── Device capability detection ───────────────────────────────────────────────

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

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Human-readable error messages ────────────────────────────────────────────

export function webAuthnError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  if (!e) return 'Something went wrong. Please try again.';
  switch (e.name) {
    case 'NotAllowedError':
      return 'Request was cancelled or timed out. Please try again.';
    case 'NotSupportedError':
      return 'This device does not support biometric authentication.';
    case 'SecurityError':
      return 'Security error — make sure you are using HTTPS.';
    case 'InvalidStateError':
      return 'This passkey is already registered.';
    case 'AbortError':
      return 'Authentication timed out. Please try again.';
    default: {
      const msg = e.message || '';
      if (msg.includes('timed out') || msg.includes('timeout')) return 'Request timed out. Please try again.';
      if (msg.includes('cancel'))   return 'Authentication was cancelled.';
      return msg || 'Biometric authentication failed. Please try again.';
    }
  }
}

// ── Low-level navigator.credentials wrappers ─────────────────────────────────
// We call navigator.credentials directly so we're not tied to a specific
// @simplewebauthn/browser version. The server returns standard
// PublicKeyCredentialCreationOptionsJSON / PublicKeyCredentialRequestOptionsJSON
// which we convert to ArrayBuffers here.

type ServerRegOptions = {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout?: number;
  attestation?: string;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: { id: string; type: 'public-key' }[];
};

type ServerAuthOptions = {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[];
  userVerification?: UserVerificationRequirement;
};

async function doRegister(opts: ServerRegOptions) {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: b64urlToBuffer(opts.challenge),
    rp: opts.rp,
    user: {
      id: new TextEncoder().encode(opts.user.id),
      name: opts.user.name,
      displayName: opts.user.displayName,
    },
    pubKeyCredParams: opts.pubKeyCredParams as PublicKeyCredentialParameters[],
    timeout: opts.timeout ?? 60000,
    attestation: (opts.attestation ?? 'none') as AttestationConveyancePreference,
    authenticatorSelection: opts.authenticatorSelection ?? {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    excludeCredentials: opts.excludeCredentials?.map((c) => ({
      id: b64urlToBuffer(c.id),
      type: c.type,
    })),
  };

  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const resp = cred.response as AuthenticatorAttestationResponse;

  let transports: string[] = [];
  try { transports = resp.getTransports?.() ?? ['internal']; } catch { transports = ['internal']; }

  // Return in RegistrationResponseJSON shape that @simplewebauthn/server expects
  return {
    id:    cred.id,
    rawId: bufferToB64url(cred.rawId),
    type:  'public-key' as const,
    response: {
      clientDataJSON:    bufferToB64url(resp.clientDataJSON),
      attestationObject: bufferToB64url(resp.attestationObject),
      transports,
    },
    clientExtensionResults: cred.getClientExtensionResults() ?? {},
  };
}

async function doAuthenticate(opts: ServerAuthOptions) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuffer(opts.challenge),
    timeout: opts.timeout ?? 60000,
    rpId: opts.rpId,
    allowCredentials: opts.allowCredentials?.map((c) => ({
      id: b64urlToBuffer(c.id),
      type: c.type,
      transports: c.transports,
    })),
    userVerification: opts.userVerification ?? 'required',
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  const resp = assertion.response as AuthenticatorAssertionResponse;

  return {
    id:    assertion.id,
    rawId: bufferToB64url(assertion.rawId),
    type:  'public-key' as const,
    response: {
      clientDataJSON:    bufferToB64url(resp.clientDataJSON),
      authenticatorData: bufferToB64url(resp.authenticatorData),
      signature:         bufferToB64url(resp.signature),
      userHandle:        resp.userHandle ? bufferToB64url(resp.userHandle) : undefined,
    },
    clientExtensionResults: assertion.getClientExtensionResults() ?? {},
  };
}

// ── Passkey credential type ───────────────────────────────────────────────────

export interface PasskeyCredential {
  id: string;
  device_name: string;
  device_type: string;
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
}

// ── useWebAuthn hook ──────────────────────────────────────────────────────────

interface WebAuthnState {
  supported:  boolean;
  available:  boolean;  // platform authenticator (biometric) present
  loading:    boolean;
  error:      string | null;
  credentials: PasskeyCredential[];
}

export function useWebAuthn() {
  const [state, setState] = useState<WebAuthnState>({
    supported:   false,
    available:   false,
    loading:     false,
    error:       null,
    credentials: [],
  });

  useEffect(() => {
    const supported = isWebAuthnSupported();
    if (!supported) { setState((s) => ({ ...s, supported: false, available: false })); return; }
    isBiometricAvailable().then((available) =>
      setState((s) => ({ ...s, supported: true, available }))
    );
  }, []);

  const setError = (error: string | null) => setState((s) => ({ ...s, error, loading: false }));
  const setBusy  = (loading: boolean)      => setState((s) => ({ ...s, loading, error: null }));

  // ── Register a new passkey (user must be logged in) ───────────────────────

  const register = useCallback(async (deviceName?: string): Promise<boolean> => {
    setBusy(true);
    try {
      const options = await api.webauthn.registerOptions();
      const registration = await doRegister(options as Parameters<typeof doRegister>[0]);
      await api.webauthn.registerVerify({ registration, deviceName });
      setState((s) => ({ ...s, loading: false, error: null }));
      return true;
    } catch (err: unknown) {
      setError(webAuthnError(err));
      return false;
    }
  }, []);

  // ── Login with passkey (returns user object on success) ───────────────────

  const login = useCallback(async (email?: string): Promise<{ id: string; name?: string; email: string; role?: string; trainer_id?: string; member_id?: string } | null> => {
    setBusy(true);
    try {
      const options = await api.webauthn.loginOptions({ email });
      const authentication = await doAuthenticate(options);
      const data = await api.webauthn.loginVerify({ authentication });
      setState((s) => ({ ...s, loading: false, error: null }));
      return data.user;
    } catch (err: unknown) {
      setError(webAuthnError(err));
      return null;
    }
  }, []);

  // ── Verify identity before a sensitive action ─────────────────────────────

  const verifyAction = useCallback(async (): Promise<string | null> => {
    setBusy(true);
    try {
      const options = await api.webauthn.actionOptions();
      const authentication = await doAuthenticate(options);
      const data = await api.webauthn.actionVerify({ authentication });
      setState((s) => ({ ...s, loading: false, error: null }));
      return data.actionToken as string;
    } catch (err: unknown) {
      setError(webAuthnError(err));
      return null;
    }
  }, []);

  // ── Credential list ───────────────────────────────────────────────────────

  const loadCredentials = useCallback(async () => {
    setBusy(true);
    try {
      const data = await api.webauthn.listCredentials();
      setState((s) => ({ ...s, loading: false, credentials: data.credentials, error: null }));
    } catch (err: unknown) {
      setError(webAuthnError(err));
    }
  }, []);

  const removeCredential = useCallback(async (id: string): Promise<boolean> => {
    setBusy(true);
    try {
      await api.webauthn.deleteCredential(id);
      setState((s) => ({
        ...s,
        loading: false,
        credentials: s.credentials.filter((c) => c.id !== id),
      }));
      return true;
    } catch (err: unknown) {
      setError(webAuthnError(err));
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { ...state, register, login, verifyAction, loadCredentials, removeCredential, clearError };
}
