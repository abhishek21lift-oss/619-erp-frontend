// The web half of the Android device-biometric bridge.
//
// The shell owns an EC P-256 key in the Android Keystore that requires a strong
// biometric for every use. This module asks it to sign a server challenge and
// never sees the private key. In a plain browser, or an APK without the bridge,
// everything here is inert.
//
// Wire: out  { type: 'deviceAuth', id, action, message? }
//       in   { type: 'deviceAuthReply', id, ok, ... }
// A reply carries `error: 'cancelled' | 'invalidated' | 'failed'` when ok is
// false. The id is what keeps two prompts (or a late reply) from crossing.

export type DeviceAuthStatus = {
  available: boolean;
  enrolled: boolean;
  deviceId: string | null;
};

export type DeviceAuthEnrollment = {
  deviceId: string;
  publicKey: string;
  label: string;
};

export type DeviceAuthErrorCode =
  | 'DEVICE_AUTH_UNAVAILABLE'
  | 'DEVICE_AUTH_CANCELLED'
  | 'DEVICE_AUTH_INVALIDATED'
  | 'DEVICE_AUTH_FAILED'
  | 'DEVICE_AUTH_TIMEOUT';

export class DeviceAuthError extends Error {
  code: DeviceAuthErrorCode;

  constructor(code: DeviceAuthErrorCode, message: string) {
    super(message);
    this.name = 'DeviceAuthError';
    this.code = code;
  }
}

interface NativeBridge {
  postMessage: (message: string) => void;
  // AndroidX's addWebMessageListener delivers native replies here, not as a
  // window 'message' event. Both are wired so shells that dispatch an event
  // keep working.
  onmessage?: (event: MessageEvent) => void;
}

interface Reply {
  type?: string;
  id?: string;
  ok?: boolean;
  error?: string;
  available?: boolean;
  enrolled?: boolean;
  deviceId?: unknown;
  publicKey?: unknown;
  label?: unknown;
  signature?: unknown;
}

interface Pending {
  resolve: (reply: Reply) => void;
  reject: (err: Error) => void;
  timer: number;
}

// The user can leave the biometric sheet open; a killed app or a backgrounded
// prompt must still release the button rather than hang forever.
const TIMEOUT_MS = 60_000;
const PENDING = new Map<string, Pending>();
let listening = false;

function bridge(): NativeBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { myptNative?: NativeBridge };
  return w.myptNative ?? null;
}

export function deviceAuthSupported(): boolean {
  const b = bridge();
  return !!b && typeof b.postMessage === 'function';
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function nativeError(kind: string): DeviceAuthError {
  if (kind === 'cancelled') return new DeviceAuthError('DEVICE_AUTH_CANCELLED', 'Fingerprint not recognised.');
  if (kind === 'invalidated') {
    return new DeviceAuthError('DEVICE_AUTH_INVALIDATED', 'Fingerprint sign-in is no longer valid on this phone.');
  }
  return new DeviceAuthError('DEVICE_AUTH_FAILED', 'Fingerprint sign-in failed.');
}

function onMessage(event: MessageEvent) {
  let data: Reply | null = null;
  try {
    data = typeof event.data === 'string' ? (JSON.parse(event.data) as Reply) : (event.data as Reply);
  } catch {
    return;
  }
  if (!data || data.type !== 'deviceAuthReply' || typeof data.id !== 'string') return;

  const pending = PENDING.get(data.id);
  if (!pending) return;
  PENDING.delete(data.id);
  window.clearTimeout(pending.timer);

  if (data.ok) pending.resolve(data);
  else pending.reject(nativeError(String(data.error || 'failed')));
}

function request(action: string, extra: Record<string, unknown> = {}): Promise<Reply> {
  const b = bridge();
  if (!b || typeof b.postMessage !== 'function') {
    return Promise.reject(new DeviceAuthError(
      'DEVICE_AUTH_UNAVAILABLE', 'Fingerprint sign-in is not available in this app.'
    ));
  }

  if (typeof window !== 'undefined') {
    if (!listening) {
      window.addEventListener('message', onMessage);
      listening = true;
    }
    if (b.onmessage !== onMessage) b.onmessage = onMessage;
  }

  const id = newId();
  return new Promise<Reply>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      PENDING.delete(id);
      reject(new DeviceAuthError('DEVICE_AUTH_TIMEOUT', 'Fingerprint sign-in timed out.'));
    }, TIMEOUT_MS);
    PENDING.set(id, { resolve, reject, timer });

    try {
      b.postMessage(JSON.stringify({ type: 'deviceAuth', id, action, ...extra }));
    } catch {
      PENDING.delete(id);
      window.clearTimeout(timer);
      reject(new DeviceAuthError('DEVICE_AUTH_FAILED', 'Fingerprint sign-in failed.'));
    }
  });
}

export async function deviceAuthStatus(): Promise<DeviceAuthStatus> {
  if (!deviceAuthSupported()) return { available: false, enrolled: false, deviceId: null };
  const reply = await request('status');
  return {
    available: reply.available === true,
    enrolled: reply.enrolled === true,
    deviceId: typeof reply.deviceId === 'string' ? reply.deviceId : null,
  };
}

export async function deviceAuthEnroll(): Promise<DeviceAuthEnrollment> {
  const reply = await request('enroll');
  if (typeof reply.deviceId !== 'string' || typeof reply.publicKey !== 'string' || !reply.publicKey) {
    throw new DeviceAuthError('DEVICE_AUTH_FAILED', 'Could not enable fingerprint sign-in. Try again.');
  }
  return {
    deviceId: reply.deviceId,
    publicKey: reply.publicKey,
    label: typeof reply.label === 'string' && reply.label ? reply.label : 'Android device',
  };
}

export async function deviceAuthSign(message: string): Promise<string> {
  const reply = await request('sign', { message });
  if (typeof reply.signature !== 'string' || !reply.signature) {
    throw new DeviceAuthError('DEVICE_AUTH_FAILED', 'Fingerprint sign-in failed.');
  }
  return reply.signature;
}

export async function deviceAuthForget(): Promise<void> {
  await request('forget');
}
