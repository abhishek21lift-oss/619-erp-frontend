'use client';

// Consume a password-reset token from the emailed link.
//
// This route previously rendered an AUTHENTICATED change-password form: it
// asked for the current password and called /api/auth/change-password. That
// made the whole reset flow a dead end — the emailed link landed here and
// demanded the very password the user had forgotten, through an endpoint that
// requires a live session they do not have.
//
// Nothing linked to the old page (change-password already lives in Settings →
// Profile and in Settings), so it is replaced outright rather than moved.

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BrandLogoWide from '@/components/BrandLogoWide';
import { api } from '@/lib/api';
import { checkNewPassword, passwordStrength, MIN_LENGTH } from '@/lib/password-policy';

const MAROON = '#0067E0';
const GOLD = '#0067E0';
const INK = '#0F172A';
const MUTE = '#64748B';
const LINE = 'rgba(15,23,42,0.10)';

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['transparent', '#EF4444', '#F59E0B', '#0067E0', '#10B981'];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Send them somewhere useful once the password is changed. The backend bumps
  // token_version, so every existing session is already invalid — signing in
  // again is required, not optional.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace('/login'), 3000);
    return () => clearTimeout(t);
  }, [done, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const check = checkNewPassword(password, confirm);
    if (!check.ok) { setError(check.error); return; }

    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset the password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  }

  const strength = passwordStrength(password);

  // No token means someone opened this URL directly rather than via the email.
  // Say so plainly instead of rendering a form that cannot possibly work.
  if (!token) {
    return (
      <div className="rounded-[20px] bg-white p-6 text-center" style={{ border: `1px solid ${LINE}`, boxShadow: '0 18px 48px rgba(15,23,42,0.08)' }}>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(239,68,68,0.10)' }}>
          <AlertCircle size={24} style={{ color: '#DC2626' }} />
        </div>
        <p className="text-[14px] font-[650]" style={{ color: INK }}>This link is missing its reset code</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
          Open the link straight from your email, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] py-3 text-[14px] font-[700] text-white"
          style={{ background: MAROON }}
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-[20px] bg-white p-6 text-center" style={{ border: `1px solid ${LINE}`, boxShadow: '0 18px 48px rgba(15,23,42,0.08)' }}>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.12)' }}>
          <CheckCircle2 size={24} style={{ color: '#10B981' }} />
        </div>
        <p className="text-[14px] font-[650]" style={{ color: INK }}>Password updated</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
          For safety, every device that was signed in has been signed out. Taking you to sign in…
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] py-3 text-[14px] font-[700] text-white"
          style={{ background: MAROON }}
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] bg-white p-6" style={{ border: `1px solid ${LINE}`, boxShadow: '0 18px 48px rgba(15,23,42,0.08)' }}>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="rp-password" className="mb-1.5 block text-[12.5px] font-[650]" style={{ color: INK }}>New password</label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTE }} />
          <input
            id="rp-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_LENGTH} characters`}
            className="w-full rounded-[12px] py-3 pl-10 pr-11 text-[14px] outline-none transition-colors focus:border-[#0067E0]"
            style={{ border: `1.5px solid ${LINE}`, color: INK }}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: MUTE }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {password && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-1 flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-full transition-colors"
                  style={{ background: i <= strength ? STRENGTH_COLOR[strength] : LINE }}
                />
              ))}
            </div>
            <span className="text-[11.5px] font-[650]" style={{ color: STRENGTH_COLOR[strength] }}>
              {STRENGTH_LABEL[strength]}
            </span>
          </div>
        )}

        <label htmlFor="rp-confirm" className="mb-1.5 mt-4 block text-[12.5px] font-[650]" style={{ color: INK }}>Confirm password</label>
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTE }} />
          <input
            id="rp-confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="w-full rounded-[12px] py-3 pl-10 pr-3 text-[14px] outline-none transition-colors focus:border-[#0067E0]"
            style={{ border: `1.5px solid ${LINE}`, color: INK }}
          />
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <AlertCircle size={15} className="mt-[1px] shrink-0" style={{ color: '#DC2626' }} />
            <span className="text-[12.5px] font-[550]" style={{ color: '#B91C1C' }}>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-[700] text-white transition-opacity disabled:opacity-60"
          style={{ background: MAROON, boxShadow: '0 8px 22px rgba(0,103,224,0.28)' }}
        >
          {busy ? <><Loader2 size={17} className="animate-spin" /> Updating…</> : 'Set new password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(120% 78% at 50% -8%, #F8FAFC 0%, #ffffff 48%)',
        color: INK,
        fontFamily: "var(--font-sans), 'Inter', system-ui, sans-serif",
        paddingTop: 'calc(max(env(safe-area-inset-top), 2.75rem) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}18, transparent 68%)` }} />
        <div className="absolute -bottom-28 -left-20 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${MAROON}10, transparent 68%)` }} />
      </div>

      <Link
        href="/login"
        className="absolute left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[12.5px] font-[600] backdrop-blur transition-colors hover:bg-white"
        style={{ color: MUTE, border: `1px solid ${LINE}`, top: 'calc(max(env(safe-area-inset-top), 2.75rem) + 0.5rem)' }}
      >
        <ArrowLeft size={13} /> Sign in
      </Link>

      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogoWide width={224} priority />
          <h1 className="mt-4 text-[27px] font-[840] tracking-[-0.025em]" style={{ color: INK }}>Set a new password</h1>
          <p className="mt-1.5 max-w-[330px] text-[14px]" style={{ color: MUTE }}>
            Choose something you have not used here before.
          </p>
        </div>

        {/* useSearchParams needs a Suspense boundary in the App Router. */}
        <Suspense fallback={<div className="h-[260px] rounded-[20px] bg-white" style={{ border: `1px solid ${LINE}` }} />}>
          <ResetPasswordForm />
        </Suspense>
      </m.div>
    </main>
  );
}
