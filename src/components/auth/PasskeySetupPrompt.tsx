'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { useFeatures } from '@/lib/features-context';
import { api } from '@/lib/api';
import { getImpersonation } from '@/lib/http';
import { isBiometricAvailable, isWebAuthnSupported, useWebAuthn } from '@/hooks/useWebAuthn';

// One card, mounted by both signed-in shells. A passkey is the only way a web
// app can offer "log in with the phone's fingerprint": the biometric never
// leaves the device, and the server stores a public key.
//
// The prompt is per account and per browser session. "Not now" snoozes it for
// a week rather than forever, because the member portal has no passkey
// settings page to come back to.

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const checkedKey = (userId: string) => `passkey.prompt.checked.${userId}`;
const snoozedKey = (userId: string) => `passkey.prompt.snoozed.${userId}`;

function thisDevice(): string {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
    ? 'Android phone'
    : 'This device';
}

// Storage can throw in private mode / when blocked. A prompt is optional UI;
// it must never take the shell down with it.
function read(store: Storage, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}

function write(store: Storage, key: string, value: string): void {
  try { store.setItem(key, value); } catch { /* storage unavailable */ }
}

export default function PasskeySetupPrompt() {
  const { user } = useAuth();
  const { enabled } = useFeatures();
  const passkeysEnabled = enabled('passkeys');
  const { register, loading, error, clearError } = useWebAuthn();
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  // Forces the card to re-render after a failed attempt, so the hook's error
  // string is read even if the hook itself did not change a value we render.
  const [failed, setFailed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // A different account in the same tab must not inherit the previous
  // account's card, success message, or pending hide timer. Runs before the
  // eligibility effect below so the new account can still show its own card.
  useEffect(() => {
    if (lastUserId.current === (user?.id ?? null)) return;
    lastUserId.current = user?.id ?? null;
    setVisible(false);
    setDone(false);
    setFailed(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, [user?.id]);

  // Move focus with the message so a keyboard user does not lose it when the
  // action buttons disappear.
  useEffect(() => {
    if (done) statusRef.current?.focus();
  }, [done]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    // Never enroll a passkey into an impersonated account: it would be a
    // durable login factor for the customer created on the operator's device.
    if (getImpersonation()) return;
    // Also covers the first render before feature flags load: no probe and no
    // credential call until the flag is known to be on.
    if (!passkeysEnabled) {
      setVisible(false);
      return;
    }
    if (read(sessionStorage, checkedKey(user.id)) === '1') return;
    if (!isWebAuthnSupported()) return;

    const snoozedAt = Number(read(localStorage, snoozedKey(user.id)) || 0);
    if (snoozedAt && Date.now() - snoozedAt < SNOOZE_MS) return;

    (async () => {
      try {
        if (!(await isBiometricAvailable())) return;
        const { credentials } = await api.webauthn.listCredentials();
        if (!cancelled && credentials.length === 0) setVisible(true);
      } catch {
        // A capability probe or credential lookup that fails must never put an
        // error on top of the page the user came here to use.
      } finally {
        if (!cancelled) write(sessionStorage, checkedKey(user.id), '1');
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, passkeysEnabled]);

  const handleEnable = useCallback(async () => {
    if (!user?.id) return;
    clearError();
    setDone(false);
    setFailed(false);
    if (!(await register(thisDevice()))) {
      setFailed(true);
      return;
    }
    write(sessionStorage, checkedKey(user.id), '1');
    setDone(true);
    hideTimer.current = setTimeout(() => setVisible(false), 4000);
  }, [clearError, register, user?.id]);

  const handleDismiss = useCallback(() => {
    if (!user?.id) return;
    write(localStorage, snoozedKey(user.id), String(Date.now()));
    setVisible(false);
  }, [user?.id]);

  if (!visible) return null;

  return (
    <section
      aria-label="Passkey login"
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
          {/* Always mounted so the live region exists before its text changes. */}
          <p
            ref={statusRef}
            role="status"
            tabIndex={-1}
            className={done ? 'text-[14px] font-[650]' : 'sr-only'}
            style={{ color: 'var(--text-primary)' }}
          >
            {done ? 'Passkey login enabled.' : ''}
          </p>
          {!done && (
            <>
              <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                Sign in faster on this device
              </p>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Enable passkey login and skip your password next time. Your fingerprint,
                face, or screen lock stays on this device.
              </p>
              {(error || failed) && (
                <p role="alert" className="mt-2 text-[12.5px] font-[600]" style={{ color: 'var(--danger-text)' }}>
                  {error || 'Biometric authentication failed. Please try again.'}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="md"
                  className="min-h-[44px]"
                  loading={loading}
                  onClick={handleEnable}
                  iconLeft={<Fingerprint size={15} />}
                >
                  Enable passkey
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  className="min-h-[44px]"
                  disabled={loading}
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
