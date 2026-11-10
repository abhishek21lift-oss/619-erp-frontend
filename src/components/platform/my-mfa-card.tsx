'use client';

// Self-service MFA for the signed-in platform operator.
//
// The studio profile page has the same card, but /settings/profile is a studio
// route and refuses a platform session. The only 2FA entry point the console
// offered was the "Set up two-factor" button on an error screen, which sent the
// operator to that refused page. This is that card, in the console they are in.
//
// The server only challenges super_admin for a second factor (routes/auth.js),
// and the platform console is super-admin-only, so this is the one account it
// can ever apply to.

import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { AlertTriangle, Copy, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';
import { Button, FormField, TextInput } from '@/components/ui';
import { Modal } from '@/app/(platform)/platform/_shared/ui';
import { CcCard } from './cc-viz';

export default function MyMfaCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let alive = true;
    api.profile.me()
      .then((me) => { if (alive) setEnabled(me.mfaEnabled); })
      .catch((err: unknown) => {
        if (alive) setLoadError(errorMessage(err, 'Could not read your security settings.'));
      });
    return () => { alive = false; };
  }, []);

  const qrSvg = useMemo(() => {
    if (!setup) return '';
    const qr = qrcode(0, 'M');
    qr.addData(setup.qrUrl);
    qr.make();
    return qr.createSvgTag({ scalable: true });
  }, [setup]);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error(`Could not copy the ${what.toLowerCase()}`);
    }
  }

  const startSetup = async () => {
    setBusy(true);
    setCodeError('');
    try {
      setSetup(await api.profile.mfa.setup());
    } catch (err) {
      toast.error(errorMessage(err, 'Could not start two-factor setup'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setCodeError('');
    try {
      const res = await api.profile.mfa.verify(code);
      setRecovery(res.recoveryCodes);
      setEnabled(true);
      setSetup(null);
      setCode('');
      toast.success('Two-factor authentication enabled');
    } catch (err) {
      setCodeError(errorMessage(err, 'That code was not accepted. Try the next one.'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!password) return;
    setBusy(true);
    setPasswordError('');
    try {
      await api.profile.mfa.disable(password);
      setEnabled(false);
      setDisableOpen(false);
      setPassword('');
      toast.success('Two-factor authentication disabled');
    } catch (err) {
      setPasswordError(errorMessage(err, 'Could not disable two-factor authentication.'));
    } finally {
      setBusy(false);
    }
  };

  const closeDisable = () => {
    if (busy) return;
    setDisableOpen(false);
    setPassword('');
    setPasswordError('');
  };

  return (
    <>
      <CcCard tone="teal" eyebrow="Your account" title="Two-factor authentication" icon={<Fingerprint size={15} />}>
        {loadError ? (
          <p className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--danger-text)' }}>
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {loadError}
          </p>
        ) : enabled === null ? (
          <p className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={14} className="animate-spin" /> Checking your second factor…
          </p>
        ) : enabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}>
              <ShieldCheck size={14} style={{ color: '#059669' }} />
              <span className="text-[12.5px] font-[650]" style={{ color: '#059669' }}>
                Active — password plus an authenticator code.
              </span>
            </div>
            <Button variant="outline" onClick={() => setDisableOpen(true)}>Disable 2FA</Button>
          </div>
        ) : setup ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div
                role="img"
                aria-label="QR code for your authenticator app"
                className="shrink-0 rounded-2xl bg-white p-3"
                style={{ width: 168, height: 168 }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  Scan with Google Authenticator, Authy or any TOTP app, then enter the six-digit code it shows.
                  Can&apos;t scan? Enter this secret manually.
                </p>
                <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <code className="min-w-0 flex-1 truncate text-[11.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                    {setup.secret}
                  </code>
                  <button type="button" onClick={() => void copy(setup.secret, 'Secret')}
                    aria-label="Copy setup secret"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70">
                    <Copy size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="flex flex-wrap items-end gap-2">
              <FormField label="6-digit code" error={codeError || undefined} required className="min-w-[180px] flex-1">
                <TextInput
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setCodeError('');
                  }}
                />
              </FormField>
              <Button type="submit" loading={busy} disabled={code.length !== 6}>Verify and enable</Button>
            </form>
            <button type="button"
              onClick={() => { setSetup(null); setCode(''); setCodeError(''); }}
              className="self-start text-[11.5px] font-[640]" style={{ color: 'var(--text-muted)' }}>
              Cancel setup
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[560px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              An operator account without a second factor can reach every studio&rsquo;s data.
              Add an authenticator app to require a code as well as your password.
            </p>
            <Button onClick={() => void startSetup()} loading={busy}>Set up two-factor</Button>
          </div>
        )}
      </CcCard>

      {disableOpen && (
        <Modal title="Disable two-factor authentication?" onClose={closeDisable}>
          <form onSubmit={(e) => { e.preventDefault(); void disable(); }} className="space-y-4">
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Your account will be protected by its password alone. Enter your current password to confirm.
            </p>
            <FormField label="Current password" error={passwordError || undefined} required>
              <TextInput
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDisable} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="danger" loading={busy} disabled={!password}>Confirm and disable</Button>
            </div>
          </form>
        </Modal>
      )}

      {recovery && (
        <Modal title="Save your recovery codes" onClose={() => setRecovery(null)}>
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Each code works once, and this is the only time they are shown. Store them somewhere safe.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-[12px] p-4"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {recovery.map((c) => (
                <code key={c} className="text-[12.5px] font-[700] tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  {c}
                </code>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => void copy(recovery.join('\n'), 'Recovery codes')}>
                <Copy size={13} /> Copy all
              </Button>
              <Button onClick={() => setRecovery(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
