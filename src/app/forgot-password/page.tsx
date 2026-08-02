'use client';

// Request a password-reset link.
//
// This page did not exist. The backend has had POST /api/auth/forgot-password
// since forever — hashed token, 15-minute expiry, enumeration-safe response —
// and nothing in the UI ever called it, so a locked-out user had no way to
// recover an account without an administrator resetting it by hand.

import { useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BrandLogoWide from '@/components/BrandLogoWide';
import { api } from '@/lib/api';

const MAROON = '#0067E0';
const GOLD = '#0067E0';
const INK = '#0F172A';
const MUTE = '#64748B';
const LINE = 'rgba(15,23,42,0.10)';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      await api.auth.forgotPassword(trimmed);
      setSent(true);
    } catch (err: unknown) {
      // Only a transport/rate-limit failure can land here — the endpoint
      // returns 200 whether or not the address exists.
      setError(err instanceof Error ? err.message : 'Could not send the reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  }

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
          <h1 className="mt-4 text-[27px] font-[840] tracking-[-0.025em]" style={{ color: INK }}>
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="mt-1.5 max-w-[330px] text-[14px]" style={{ color: MUTE }}>
            {sent
              ? 'If that address belongs to an account, a reset link is on its way. It expires in 15 minutes.'
              : 'Enter the email you sign in with and we will send you a link to set a new password.'}
          </p>
        </div>

        <div className="rounded-[20px] bg-white p-6" style={{ border: `1px solid ${LINE}`, boxShadow: '0 18px 48px rgba(15,23,42,0.08)' }}>
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <CheckCircle2 size={24} style={{ color: '#10B981' }} />
              </div>
              <p className="text-[13.5px] leading-relaxed" style={{ color: MUTE }}>
                Nothing in your inbox after a few minutes? Check spam, then try again — and make sure
                you used the address your studio registered.
              </p>
              <button
                onClick={() => { setSent(false); setError(''); }}
                className="mt-4 text-[13px] font-[650]"
                style={{ color: MAROON }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label className="mb-1.5 block text-[12.5px] font-[650]" style={{ color: INK }}>Email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTE }} />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
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
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-[14.5px] font-[700] text-white transition-opacity disabled:opacity-60"
                style={{ background: MAROON, boxShadow: '0 8px 22px rgba(0,103,224,0.28)' }}
              >
                {busy ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[13px]" style={{ color: MUTE }}>
          Remembered it? <Link href="/login" className="font-[650]" style={{ color: MAROON }}>Sign in</Link>
        </p>
      </m.div>
    </main>
  );
}
