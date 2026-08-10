'use client';

// Activation. The first screen a client ever sees of MY PT STUDIO.
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
import { invitationPasswordRules, checkInvitationPassword } from '@/lib/password-policy';

/** Brand for this flow: black / white / maroon, matching the activation email.
 *  Both constants are the same red on purpose: the darker shade the email
 *  gradient uses is not in the palette, and /auth/set-password resolved that
 *  conflict the same way rather than adding a one-off colour. */
const MAROON = '#7F1D1D';
const MAROON_DARK = '#7F1D1D';

const EASE = [0.16, 1, 0.3, 1] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div
            className="text-[15px] font-[800] uppercase"
            style={{ color: 'var(--text-primary)', letterSpacing: '3px' }}
          >
            MY&nbsp;PT&nbsp;STUDIO
          </div>
          <div className="mx-auto mt-2 h-[3px] w-11 rounded-full" style={{ background: MAROON }} />
        </div>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="rounded-[18px] p-6 sm:p-7"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {children}
        </m.div>
        <p className="mt-5 text-center text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
          Need help? <a href="mailto:support@myptstudio.com" style={{ color: MAROON }}>support@myptstudio.com</a>
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
          style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}
        >
          <AlertTriangle size={22} />
        </div>
        <h1 className="mb-2 text-[19px] font-[800]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          This link can&rsquo;t be used
        </h1>
        <p className="mb-5 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
            className="flex h-11 items-center justify-center rounded-[11px] text-[13.5px] font-[700]"
            style={{ background: MAROON, color: '#fff' }}
          >
            Go to sign in
          </Link>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
          style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}
        >
          <ShieldCheck size={26} />
        </m.div>
        <h1 className="mb-2 text-[21px] font-[800]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          You&rsquo;re all set
        </h1>
        <p className="mb-6 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your password is saved. Sign in with <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> to see your plan.
        </p>
        <button
          onClick={() => router.replace('/member-login')}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] text-[14px] font-[700]"
          style={{ background: MAROON, color: '#fff' }}
        >
          Sign in now <ArrowRight size={15} />
        </button>
        <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
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
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setDead('The link is missing its activation code. Use the button in the email your trainer sent.');
      setLoading(false);
      return;
    }
    api.clientActivation.preview(token)
      .then((r) => setPreview(r.data))
      .catch((e: unknown) => setDead(e instanceof Error ? e.message : 'This activation link is not valid.'))
      .finally(() => setLoading(false));
  }, [token]);

  const rules = invitationPasswordRules(password);
  const allOk = rules.every((r) => r.ok) && password === confirm && confirm.length > 0;

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = checkInvitationPassword(password, confirm);
    if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try {
      const r = await api.clientActivation.accept(token, password);
      setDone(r.data.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not set your password.';
      // A 410 means the link died between loading this page and submitting —
      // it expired while the form sat open, or the trainer resent it. That is
      // not something retyping fixes, so it needs the dead-link screen rather
      // than an inline error the reader will fight with.
      const status = (err as { status?: number })?.status;
      if (status === 410) { setDead(msg); return; }
      setError(msg);
    } finally { setBusy(false); }
  }, [token, password, confirm]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: MAROON }} />
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Checking your link…</p>
        </div>
      </Shell>
    );
  }
  if (dead) return <DeadLink message={dead} />;
  if (done) return <Activated email={done} />;
  if (!preview) return null;

  const inputStyle = {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as const;

  return (
    <Shell>
      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: MAROON, color: '#fff' }}
          >
            <Dumbbell size={17} />
          </span>
          <div className="min-w-0">
            {/* Who this is from, first. A client recognises their studio's
                name long before they recognise the platform's. */}
            <p className="truncate text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>
              {preview.studio_name}
            </p>
            {/* Masked, because this page is public — it must not become a way
                to read back an address from a token. Enough to recognise. */}
            <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {preview.email_masked}
            </p>
          </div>
        </div>
        <h1 className="text-[20px] font-[800]" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Create your password
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {preview.client_name ? `Hello ${preview.client_name}. ` : ''}
          Choose a password to see your workouts, diet, progress and payments.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="pw" className="mb-1.5 block text-[11.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
            New password
          </label>
          <div className="relative">
            <input
              id="pw"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              className="h-12 w-full rounded-[11px] pl-3.5 pr-11 text-[15px] outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-[9px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="pw2" className="mb-1.5 block text-[11.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
            Confirm password
          </label>
          <input
            id="pw2"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="h-12 w-full rounded-[11px] px-3.5 text-[15px] outline-none"
            style={inputStyle}
          />
        </div>

        {/* A live checklist rather than a strength bar. "Strength: fair" does
            not tell anyone what to type next; a rule that flips to a tick
            does. Every item is enforced by the server too — this is the
            courtesy copy of a rule that lives in routes/invitations.js. */}
        <ul className="flex flex-col gap-1.5 rounded-[11px] p-3" style={{ background: 'var(--bg-subtle)' }}>
          {rules.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-[12px]"
              style={{ color: r.ok ? 'var(--success-text)' : 'var(--text-muted)' }}>
              {r.ok ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
              {r.label}
            </li>
          ))}
          {confirm.length > 0 && (
            <li className="flex items-center gap-2 text-[12px]"
              style={{ color: password === confirm ? 'var(--success-text)' : 'var(--text-muted)' }}>
              {password === confirm ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
              Both passwords match
            </li>
          )}
        </ul>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] px-3 py-2.5 text-[12.5px]"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!allOk || busy}
          className="flex h-12 items-center justify-center gap-2 rounded-[11px] text-[14px] font-[700] transition-opacity disabled:opacity-40"
          style={{ background: MAROON, backgroundImage: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DARK} 100%)`, color: '#fff' }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {busy ? 'Activating…' : 'Activate my account'}
        </button>

        <p className="text-center text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
          This link can be used once and expires{' '}
          {new Date(preview.expires_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
          })}
          .
        </p>

        {/* On the page a phishing copy would imitate. Saying it here is the
            only place the client will read it at the moment it matters. */}
        <p className="text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-disabled)' }}>
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
          <Loader2 size={24} className="animate-spin" style={{ color: MAROON }} />
        </div>
      </Shell>
    }>
      <ActivateForm />
    </Suspense>
  );
}
