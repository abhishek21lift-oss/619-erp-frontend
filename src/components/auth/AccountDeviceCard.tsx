'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import {
  deviceAuthSupported, deviceAuthStatus, deviceAuthEnroll, deviceAuthSign, deviceAuthForget,
} from '@/lib/device-auth';

// "This phone" card, mounted on the trainer's passkey settings page and the
// member's account page. Renders nothing in a browser, so those pages are
// unchanged outside the Android shell.
//
// Reconciles both sides: the shell knows whether a Keystore key exists, the
// server knows whether the credential row does. Either half missing means the
// user must enable again, never a dead end.

type CredentialRow = { id: string; credential_id: string };

export default function AccountDeviceCard() {
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [off, setOff] = useState(false);

  const load = useCallback(async () => {
    const [status, list] = await Promise.all([
      deviceAuthStatus(),
      api.webauthn.listCredentials(),
    ]);
    const match = status.deviceId
      ? list.credentials.find((c) => c.credential_id === `native:${status.deviceId}`)
      : undefined;
    setDeviceId(status.deviceId);
    setCredentialId(match?.id ?? null);
    setOn(status.available && status.enrolled && !!match);
    setOff(false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!deviceAuthSupported()) return;
    load().catch(() => {
      setReady(true);
      setError('Could not check fingerprint sign-in.');
    });
  }, [load]);

  const enable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
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
      setDeviceId(enrollment.deviceId);
      setOn(true);
      setOff(false);
      window.dispatchEvent(new Event('webauthn-credentials-changed'));
      // Best effort: the row id is only needed for the turn-off button.
      api.webauthn.listCredentials()
        .then((list) => {
          const match = list.credentials.find(
            (c) => c.credential_id === `native:${enrollment.deviceId}`
          );
          setCredentialId(match?.id ?? null);
        })
        .catch(() => setCredentialId(null));
    } catch {
      setError('Could not enable fingerprint sign-in. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Server first: if it fails, the credential is still valid and the local
      // key must stay so the user can try again.
      if (credentialId) await api.webauthn.deleteCredential(credentialId);
      await deviceAuthForget();
      setOn(false);
      setOff(true);
      setCredentialId(null);
      // The list on the same page must drop the row this card just revoked.
      window.dispatchEvent(new Event('webauthn-credentials-changed'));
    } catch {
      setError('Could not turn off fingerprint sign-in. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, credentialId]);

  if (!deviceAuthSupported() || !ready) return null;

  return (
    <section
      aria-label="Fingerprint sign-in on this phone"
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
          <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {on ? 'Fingerprint sign-in is on for this phone' : 'Fingerprint sign-in is off for this phone'}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {on
              ? 'You can sign in with your fingerprint or face instead of your password.'
              : 'Use your fingerprint or face to sign in on this Android device instead of typing your password.'}
          </p>
          {off && (
            <p role="status" className="mt-2 text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              Turned off on this phone.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-[12.5px] font-[600]" style={{ color: 'var(--danger-text)' }}>
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {on ? (
              <Button
                size="md"
                variant="ghost"
                className="min-h-[44px]"
                disabled={busy || !credentialId}
                onClick={disable}
              >
                Turn off on this phone
              </Button>
            ) : (
              <Button
                size="md"
                className="min-h-[44px]"
                loading={busy}
                onClick={enable}
                iconLeft={<Fingerprint size={15} />}
              >
                Enable fingerprint sign-in
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
