import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deviceAuthEnroll, deviceAuthForget, deviceAuthSign, deviceAuthStatus, deviceAuthSupported,
} from '@/lib/device-auth';

function bridge() {
  const postMessage = vi.fn();
  (window as Window & { myptNative?: { postMessage: typeof postMessage } }).myptNative = { postMessage };
  return postMessage;
}

function reply(data: Record<string, unknown>) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

function lastSent(postMessage: ReturnType<typeof bridge>) {
  return JSON.parse(postMessage.mock.calls[postMessage.mock.calls.length - 1][0] as string);
}

beforeEach(() => {
  delete (window as Window & { myptNative?: unknown }).myptNative;
});

afterEach(() => {
  delete (window as Window & { myptNative?: unknown }).myptNative;
  vi.useRealTimers();
});

describe('in a plain browser', () => {
  it('reports no bridge and an inert status', async () => {
    expect(deviceAuthSupported()).toBe(false);
    await expect(deviceAuthStatus()).resolves.toEqual({
      available: false, enrolled: false, deviceId: null,
    });
  });

  it('rejects sign without waiting for a timeout', async () => {
    await expect(deviceAuthSign('x')).rejects.toMatchObject({ code: 'DEVICE_AUTH_UNAVAILABLE' });
  });
});

describe('through the Android bridge', () => {
  it('asks for status and resolves the reply', async () => {
    const postMessage = bridge();
    const pending = deviceAuthStatus().catch((e) => e);
    const sent = lastSent(postMessage);
    expect(sent).toMatchObject({ type: 'deviceAuth', action: 'status' });
    expect(typeof sent.id).toBe('string');

    reply({ type: 'deviceAuthReply', id: sent.id, ok: true, available: true, enrolled: true, deviceId: 'a'.repeat(32) });

    await expect(pending).resolves.toEqual({ available: true, enrolled: true, deviceId: 'a'.repeat(32) });
  });

  it('also accepts the reply on window.myptNative.onmessage', async () => {
    // AndroidX addWebMessageListener does not fire a window 'message' event;
    // the shim assigns proxy.postMessage to window.myptNative.onmessage.
    const postMessage = bridge();
    const pending = deviceAuthStatus();
    const sent = lastSent(postMessage);
    const onmessage = (window as Window & {
      myptNative?: { onmessage?: (event: MessageEvent) => void };
    }).myptNative?.onmessage;
    expect(typeof onmessage).toBe('function');

    onmessage!(new MessageEvent('message', {
      data: { type: 'deviceAuthReply', id: sent.id, ok: true, available: true, enrolled: true, deviceId: 'c'.repeat(32) },
    }));

    await expect(pending).resolves.toEqual({
      available: true, enrolled: true, deviceId: 'c'.repeat(32),
    });
  });

  it('enrolls and returns the public key the server needs', async () => {
    const postMessage = bridge();
    const pending = deviceAuthEnroll();
    const sent = lastSent(postMessage);
    expect(sent.action).toBe('enroll');

    reply({ type: 'deviceAuthReply', id: sent.id, ok: true, deviceId: 'b'.repeat(32), publicKey: 'pk', label: 'Pixel 8' });

    await expect(pending).resolves.toEqual({ deviceId: 'b'.repeat(32), publicKey: 'pk', label: 'Pixel 8' });
  });

  it('signs an exact message and returns the signature', async () => {
    const postMessage = bridge();
    const pending = deviceAuthSign('MPS-DEVICE-LOGIN-V1\nabc');
    const sent = lastSent(postMessage);
    expect(sent).toMatchObject({ action: 'sign', message: 'MPS-DEVICE-LOGIN-V1\nabc' });

    reply({ type: 'deviceAuthReply', id: sent.id, ok: true, signature: 'sig' });

    await expect(pending).resolves.toBe('sig');
  });

  it('forgets the local key', async () => {
    const postMessage = bridge();
    const pending = deviceAuthForget();
    const sent = lastSent(postMessage);
    expect(sent.action).toBe('forget');

    reply({ type: 'deviceAuthReply', id: sent.id, ok: true });
    await expect(pending).resolves.toBeUndefined();
  });

  it('maps a native rejection to a typed error code', async () => {
    const postMessage = bridge();
    const pending = deviceAuthSign('x');
    reply({ type: 'deviceAuthReply', id: lastSent(postMessage).id, ok: false, error: 'invalidated' });

    await expect(pending).rejects.toMatchObject({ code: 'DEVICE_AUTH_INVALIDATED' });
  });

  it('times out when the app is backgrounded mid-prompt, and clears the pending entry', async () => {
    vi.useFakeTimers();
    const postMessage = bridge();
    const pending = deviceAuthSign('x');
    const sent = lastSent(postMessage);
    const assertion = expect(pending).rejects.toMatchObject({ code: 'DEVICE_AUTH_TIMEOUT' });

    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;

    // A late reply for that id is ignored, not thrown as an unhandled error.
    expect(() => reply({ type: 'deviceAuthReply', id: sent.id, ok: true, signature: 'late' })).not.toThrow();
  });

  it('ignores a reply with an unknown id', async () => {
    const postMessage = bridge();
    const pending = deviceAuthSign('x');
    expect(() => reply({ type: 'deviceAuthReply', id: 'unknown', ok: true, signature: 'nope' })).not.toThrow();

    reply({ type: 'deviceAuthReply', id: lastSent(postMessage).id, ok: true, signature: 'real' });
    await expect(pending).resolves.toBe('real');
  });
});
