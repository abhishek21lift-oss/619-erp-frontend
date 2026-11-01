'use client';

// Activation. The first screen a new client ever sees of MY PT STUDIO.
//
// The sibling of /auth/set-password, which does this for studio owners, and
// built the same way for the same reason: it runs with NO session — the token
// in the URL is the only credential — so it renders outside AppShell and
// Guard. Wrapping it in either would bounce the very person it exists for to
// /login.
//
// Where it differs is tone and framing. A studio owner is activating a
// business they bought; a client is being handed an app by their trainer, may
// never have heard of the platform, and is being asked to type a password on
// a page they arrived at from an email. So this leads with who it is from and
// what they get, and says plainly that nobody will ever ask for the password
// by email — because a client is exactly the person a phishing copy of this
// page would target.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import Link from 'next/link';
import {
  Loader2, Eye, EyeOff, Check, X, ShieldCheck, AlertTriangle, ArrowRight, Dumbbell,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ClientActivationPreview } from '@/lib/api';
import { invitationPasswordRules } from '@/lib/password-policy';
import { errorMessage } from '@/lib/forms/errors';
import { clientActivateSchema } from '@/lib/forms/schemas/client';
import { Wordmark } from '@/components/landing/Wordmark';
import { SoftField, SoftInput } from '@/components/landing/SoftField';
import { C, CARD, PRIMARY_BUTTON } from '@/components/landing/tokens';

const EASE = [0.16, 1, 0.3, 1] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10"
      style={{ background: C.canvasAlt }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <Wordmark size={26} priority />
        </div>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="rounded-[20px] p-6 sm:p-7"
          style={{ background: CARD.background, border: CARD.border, boxShadow: CARD.boxShadow }}
        >
          {children}
        </m.div>
        <p className="mt-5 text-center text-[12px]" style={{ color: C.muted }}>
          Need help? <a href="mailto:support@myptstudio.com" style={{ color: C.blueHi }}>support@myptstudio.com</a>
        </p>
      </div>
    </div>
  );
}

/* ── Dead link ───────────────────────────────────────────────────────────── */

function DeadLink({ message }: { message: string }) {
  return (
    <Shell>
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]"
          style={{ background: C.redSoft, color: C.red }}
        >
          <AlertTriangle size={22} />
        </div>
        <h1 className="mb-2 text-[20px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          This link can&rsquo;t be used
        </h1>
        <p className="mb-5 text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>
          {message}
        </p>
        {/* The route forward is the trainer, not support. A client cannot
            reissue their own link, and support cannot either without going
            through the studio — so pointing at support would be a detour that
            ends back here. */}
        <div className="flex flex-col gap-2">
          <Link
            // Member Login, not /login. The only person who ever reaches this
            // page is a client, and /login refuses member accounts outright —
            // sending them there ends in a second dead end.
            href="/member-login"
            className={`${PRIMARY_BUTTON} h-11 text-[14px]`}
          >
            Go to sign in
          </Link>
        </div>
        <p className="mt-4 text-[12px] leading-[1.5]" style={{ color: C.muted }}>
          Already set a password? Sign in above. Otherwise ask your trainer to send a new activation link.
        </p>
      </div>
    </Shell>
  );
}

/* ── Success ─────────────────────────────────────────────────────────────── */

function Activated({ email }: { email: string }) {
  const router = useRouter();
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) { router.replace('/member-login'); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, router]);

  return (
    <Shell>
      <div className="text-center">
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: C.emeraldSoft, color: C.emerald }}
        >
          <ShieldCheck size={26} />
        </m.div>
        <h1 className="mb-2 text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          You&rsquo;re all set
        </h1>
        <p className="mb-6 text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>
          Your password is saved. Sign in with <strong style={{ color: C.ink }}>{email}</strong> to see your plan.
        </p>
        <button
          onClick={() => router.replace('/member-login')}
          className={`${PRIMARY_BUTTON} h-12 w-full text-[15px]`}
        >
          Sign in now <ArrowRight size={15} />
        </button>
        <p className="mt-3 text-[12px]" style={{ color: C.faint }}>
          Taking you there in {count}s
        </p>
      </div>
    </Shell>
  );
}

/* ── The form ────────────────────────────────────────────────────────────── */

function ActivateForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [preview, setPreview] = useState<ClientActivationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dead, setDead] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setDead('The link is missing its activation code. Use the button in the email your trainer sent.');
      setLoading(false);
      return;
    }
    api.clientActivation.preview(token)
      .then((r) => setPreview(r.data))
      .catch((e: unknown) => setDead(errorMessage(e, 'This activation link is not valid.')))
      .finally(() => setLoading(false));
  }, [token]);

  const rules = invitationPasswordRules(password);
  const allOk = rules.every((r) => r.ok) && password === confirm && confirm.length > 0;

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = clientActivateSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === 'string' && !next[k]) next[k] = String(issue.message);
      }
      setFieldErrors(next);
      setError(Object.values(next).join(' '));
      return;
    }
    setFieldErrors({});
    setError('');
    setBusy(true);
    try {
      const r = await api.clientActivation.accept(token, password);
      setDone(r.data.email);
    } catch (err: unknown) {
      const msg = errorMessage(err, 'Could not set your password.');
      // A 410 means the link died between loading this page and submitting —
      // it expired while the form sat open, or the trainer resent it. That is
      // not something retyping fixes, so it needs the dead-link screen rather
      // than an inline error the reader will fight with.
      const status = (err as { status?: number })?.status;
      if (status === 410) { setDead(msg); return; }
      setError(msg);
    } finally { setBusy(false); }
  }, [token, password, confirm]);

  /** Clear one field's error as soon as the user edits it, so a red message
   *  always refers to the current value. */
  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      setFieldErrors(next);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
          <p className="text-[13px]" style={{ color: C.muted }}>Checking your link…</p>
        </div>
      </Shell>
    );
  }
  if (dead) return <DeadLink message={dead} />;
  if (done) return <Activated email={done} />;
  if (!preview) return null;

  const inputStyle = { color: C.ink } as const;

  return (
    <Shell>
      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: C.blueWash, color: C.blueHi }}
          >
            <Dumbbell size={17} />
          </span>
          <div className="min-w-0">
            {/* Who this is from, first. A client recognises their studio's
                name long before they recognise the platform's. */}
            <p className="truncate text-[14px] font-[600]" style={{ color: C.ink }}>
              {preview.studio_name}
            </p>
            {/* Masked, because this page is public — it must not become a way
                to read back an address from a token. Enough to recognise. */}
            <p className="truncate text-[12px]" style={{ color: C.muted }}>
              {preview.email_masked}
            </p>
          </div>
        </div>
        <h1 className="text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          Create your password
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: C.muted }}>
          {preview.client_name ? `Hello ${preview.client_name}. ` : ''}
          Choose a password to see your workouts, diet, progress and payments.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <SoftField label="New password" error={fieldErrors.password}>
          <SoftInput
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            autoComplete="new-password"
            autoFocus
            className="h-12"
            style={inputStyle}
            trailing={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-[9px] transition-colors hover:bg-black/5"
                style={{ color: C.muted }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </SoftField>

        <SoftField label="Confirm password" error={fieldErrors.confirm}>
          <SoftInput
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); clearFieldError('confirm'); }}
            autoComplete="new-password"
            className="h-12"
            style={inputStyle}
          />
        </SoftField>

        {/* A live checklist rather than a strength bar. "Strength: fair" does
            not tell anyone what to type next; a rule that flips to a tick
            does. Every item is enforced by the server too — this is the
            courtesy copy of a rule that lives in routes/invitations.js. */}
        <ul className="flex flex-col gap-1.5 rounded-[10px] p-3" style={{ background: C.canvasAlt }}>
          {rules.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-[12px]"
              style={{ color: r.ok ? C.emerald : C.muted }}>
              {r.ok ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
              {r.label}
            </li>
          ))}
          {confirm.length > 0 && (
            <li className="flex items-center gap-2 text-[12px]"
              style={{ color: password === confirm ? C.emerald : C.muted }}>
              {password === confirm ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
              Both passwords match
            </li>
          )}
        </ul>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] px-3 py-2.5 text-[12.5px]"
            style={{ background: C.redSoft, color: C.red }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!allOk || busy}
          className={`${PRIMARY_BUTTON} h-12 w-full text-[15px]`}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {busy ? 'Activating…' : 'Activate my account'}
        </button>

        <p className="text-center text-[12px]" style={{ color: C.faint }}>
          This link can be used once and expires{' '}
          {new Date(preview.expires_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
          })}
          .
        </p>

        {/* On the page a phishing copy would imitate. Saying it here is the
            only place the client will read it at the moment it matters. */}
        <p className="text-center text-[11.5px] leading-[1.5]" style={{ color: C.faint }}>
          MY PT STUDIO and your trainer will never ask for your password by email or message.
        </p>
      </form>
    </Shell>
  );
}

export default function ClientActivatePage() {
  return (
    <Suspense fallback={
      <Shell>
        <div className="flex justify-center py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
        </div>
      </Shell>
    }>
      <ActivateForm />
    </Suspense>
  );
}
