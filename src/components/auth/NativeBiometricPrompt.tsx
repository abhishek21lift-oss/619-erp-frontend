'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getImpersonation } from '@/lib/http';
import {
  deviceAuthSupported, deviceAuthStatus, deviceAuthEnroll, deviceAuthSign,
} from '@/lib/device-auth';

// One card, mounted by both signed-in shells inside the Android app.
//
// This is not a passkey: the WebView has no WebAuthn, so the shell holds an
// Android Keystore key behind a strong biometric and the server stores only the
// public half. "Not now" snoozes for a week, not forever, because a member has
// no passkey settings page of their own.

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const snoozedKey = (userId: string) => `device.prompt.snoozed.${userId}`;

function read(store: Storage, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}

function write(store: Storage, key: string, value: string): void {
  try { store.setItem(key, value); } catch { /* storage unavailable */ }
}

export default function NativeBiometricPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // A different account in the same tab must not inherit this card or its
  // success message.
  useEffect(() => {
    if (lastUserId.current === (user?.id ?? null)) return;
    lastUserId.current = user?.id ?? null;
    setVisible(false);
    setDone(false);
    setError('');
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    if (done) statusRef.current?.focus();
  }, [done]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    // Never enroll into an impersonated account: it would be a durable login
    // factor for the customer, created on the operator's device.
    if (getImpersonation()) return;
    if (!deviceAuthSupported()) return;
    const snoozedAt = Number(read(localStorage, snoozedKey(user.id)) || 0);
    if (snoozedAt && Date.now() - snoozedAt < SNOOZE_MS) return;

    deviceAuthStatus()
      .then((s) => {
        if (!cancelled && s.available && !s.enrolled) setVisible(true);
      })
      .catch(() => { /* probe failure must not surface as a page error */ });

    return () => { cancelled = true; };
  }, [user?.id]);

  const handleEnable = useCallback(async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    setError('');
    setDone(false);
    try {
      const opts = await api.deviceAuth.registerOptions();
      const enrollment = await deviceAuthEnroll();
      const signature = await deviceAuthSign(`MPS-DEVICE-REGISTER-V1\n${opts.challenge}`);
      await api.deviceAuth.registerVerify({
        challenge: opts.challenge,
        deviceId: enrollment.deviceId,
        publicKey: enrollment.publicKey,
        label: enrollment.label,
        signature,
      });
      setDone(true);
      // Confirm the shell now reports the credential it just created.
      deviceAuthStatus().catch(() => {});
      hideTimer.current = setTimeout(() => setVisible(false), 4000);
    } catch {
      setError('Could not enable fingerprint sign-in. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, user?.id]);

  const handleDismiss = useCallback(() => {
    if (!user?.id) return;
    write(localStorage, snoozedKey(user.id), String(Date.now()));
    setVisible(false);
  }, [user?.id]);

  if (!visible) return null;

  return (
    <section
      aria-label="Fingerprint sign-in"
      className="mb-4 rounded-2xl p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
        >
          <Fingerprint size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            ref={statusRef}
            role="status"
            tabIndex={-1}
            className={done ? 'text-[14px] font-[650]' : 'sr-only'}
            style={{ color: 'var(--text-primary)' }}
          >
            {done ? 'Fingerprint sign-in enabled.' : ''}
          </p>
          {!done && (
            <>
              <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                Sign in with your fingerprint
              </p>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Skip your password on this phone. Your fingerprint or face stays on the
                device; the app stores only a key the screen can never export.
              </p>
              {error && (
                <p role="alert" className="mt-2 text-[12.5px] font-[600]" style={{ color: 'var(--danger-text)' }}>
                  {error}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="md"
                  className="min-h-[44px]"
                  loading={busy}
                  onClick={handleEnable}
                  iconLeft={<Fingerprint size={15} />}
                >
                  Enable fingerprint sign-in
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  className="min-h-[44px]"
                  disabled={busy}
                  onClick={handleDismiss}
                >
                  Not now
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
