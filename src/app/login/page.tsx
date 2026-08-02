'use client';

/**
 * MY PT STUDIO — authentication experience.
 *
 * A premium, enterprise-grade sign-in surface: a rich blue+black brand panel
 * on the left (product showcase, live-feeling analytics, rotating proof) and a
 * clean glass auth card on the right. Self-contained blue/black palette, taken
 * from the logo mark, so it matches the marketing site rather than the
 * in-product tokens.
 *
 * Everything here is wired to real auth: password, Google (when a client id is
 * configured) and passkey / Face ID / fingerprint (when the device supports a
 * platform authenticator). We deliberately do NOT render buttons for providers
 * that have no backend (Apple, magic-link) — no dead UI. Password resets are
 * handled by the workspace administrator (there is no self-serve reset
 * endpoint), so the "forgot password" flow routes there honestly.
 */

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogoWide from '@/components/BrandLogoWide';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, ArrowRight, ArrowLeft, Fingerprint, Loader2, Lock,
  ShieldCheck, Check, X, KeyRound, AlertTriangle, Building2, Copy,
} from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/lib/auth-context';
import { isWebAuthnSupported, isBiometricAvailable, webAuthnError } from '@/hooks/useWebAuthn';

// ── Palette (mirrors the marketing site) ─────────────────────────────────────
// Blue + black, from the MY PT STUDIO cube mark — the same values LandingPage
// uses, so signing in doesn't jump from a blue page to a maroon one. The
// constant names stay MAROON/GOLD deliberately: this is a colour change, not a
// rename, and keeping them makes the diff readable against the marketing file.
const MAROON = '#0067E0';       // primary — logo blue
const MAROON_DEEP = '#0F172A';  // near-black — the logo's cube
const GOLD = '#0067E0';         // bright accent
const INK = '#0F172A';          // blue-black body text
const MUTE = '#64748B';         // neutral slate
const LINE = 'rgba(15,23,42,0.10)';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SUPPORT_EMAIL = 'help@myptstudio.app';

const LS_EMAIL = 'myptstudio.lastEmail';
const LS_ORG = 'myptstudio.lastOrg';
const LS_REMEMBER = 'myptstudio.remember';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Brand wordmark ───────────────────────────────────────────────────────────
function Wordmark({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/mypt-logo.png"
        alt="MY PT STUDIO"
        width={size}
        height={size}
        priority
        className="shrink-0 object-contain"
        style={{ height: size, width: size, filter: light ? 'drop-shadow(0 3px 10px rgba(0,0,0,0.35))' : 'none' }}
      />
      <span className="text-[16px] font-[750] tracking-[-0.01em]" style={{ color: light ? '#fff' : INK }}>
        MY&nbsp;PT&nbsp;<span style={{ color: GOLD }}>STUDIO</span>
      </span>
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD MODAL (honest — resets go through the workspace admin)
// ══════════════════════════════════════════════════════════════════════════

function ForgotModal({ open, onClose, prefillEmail }: { open: boolean; onClose: () => void; prefillEmail: string }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Password reset request')}&body=${encodeURIComponent(
    `Hi,\n\nI need to reset the password for my MY PT STUDIO account${prefillEmail ? ` (${prefillEmail})` : ''}.\n\nThank you.`,
  )}`;

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(SUPPORT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ }
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog" aria-modal="true" aria-labelledby="forgot-title"
        >
          <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
          <m.div
            className="relative w-full max-w-[440px] overflow-hidden rounded-3xl bg-white"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ boxShadow: '0 40px 90px -30px rgba(15,23,42,0.5)' }}
          >
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${MAROON}, ${GOLD})` }} />
            <div className="p-7">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${MAROON}12` }}>
                  <KeyRound size={20} style={{ color: MAROON }} />
                </span>
                <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-[color:var(--mute)] transition-colors hover:bg-black/5" style={{ color: MUTE }}>
                  <X size={17} />
                </button>
              </div>

              <h2 id="forgot-title" className="mt-4 text-[19px] font-[800] tracking-[-0.01em]" style={{ color: INK }}>Reset your password</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: MUTE }}>
                For your workspace&rsquo;s security, password resets are issued by your studio&rsquo;s trainer.
                Send them a quick request and they&rsquo;ll set you up with a new password.
              </p>

              <a
                href={mailto}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14.5px] font-[700] text-white transition-transform hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%)`, boxShadow: `0 14px 30px ${MAROON}44` }}
              >
                <Mail size={16} /> Email my administrator
              </a>

              <button
                onClick={copy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[13.5px] font-[650] transition-colors hover:bg-black/[0.03]"
                style={{ color: INK, border: `1px solid ${LINE}` }}
              >
                {copied ? <><Check size={15} style={{ color: '#059669' }} /> Copied</> : <><Copy size={15} /> {SUPPORT_EMAIL}</>}
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════

export default function LoginPage() {
  const { user, login, loginWithGoogle, loginWithPasskey, loading } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  // Second factor: shown after the server challenges a 2FA-enabled account.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [capsOn, setCapsOn] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [lastOrg, setLastOrg] = useState<string | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState<string>('');

  const [passkeyReady, setPasskeyReady] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const pwRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Google's button takes a fixed pixel width, so we measure the card's inner
  // width and pass it through — otherwise its default (or a hard-coded width)
  // overflows narrow phones and blows out the whole document width.
  const googleWrapRef = useRef<HTMLDivElement>(null);
  const [googleW, setGoogleW] = useState(300);

  // Device passkey capability
  useEffect(() => {
    if (isWebAuthnSupported()) isBiometricAvailable().then(setPasskeyReady);
  }, []);

  // Keep the Google button sized to its container
  useEffect(() => {
    const el = googleWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      if (w > 0) setGoogleW(Math.max(200, Math.min(w, 400)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [passkeyReady]);

  // Restore remembered account
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(LS_EMAIL) ?? '';
      const rememberPref = localStorage.getItem(LS_REMEMBER);
      setLastOrg(localStorage.getItem(LS_ORG));
      if (savedEmail && rememberPref !== '0') {
        setRememberedEmail(savedEmail);
        setEmail(savedEmail);
        setRemember(true);
      }
    } catch { /* private mode */ }
  }, []);

  // Redirect once authenticated (role-aware)
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'trainer') router.replace('/trainer/dashboard');
      else if (user.role === 'member') router.replace('/member/dashboard');
      else router.replace('/pt-os');
    }
  }, [user, loading, router]);

  const emailValid = EMAIL_RE.test(email.trim());
  const emailError = touched.email && !email.trim() ? 'Email is required.' : touched.email && !emailValid ? 'Enter a valid email address.' : '';
  const passwordError = touched.password && !password ? 'Password is required.' : '';

  function persistRemember(u: { email: string; organization_name?: string | null }) {
    try {
      if (remember) {
        localStorage.setItem(LS_EMAIL, u.email);
        localStorage.setItem(LS_REMEMBER, '1');
        if (u.organization_name) localStorage.setItem(LS_ORG, u.organization_name);
      } else {
        localStorage.setItem(LS_REMEMBER, '0');
        localStorage.removeItem(LS_EMAIL);
        localStorage.removeItem(LS_ORG);
      }
    } catch { /* noop */ }
  }

  function fail(msg: string) {
    setError(msg);
    setShakeKey((k) => k + 1);
    setBusy(false);
    setPasskeyBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    if (!email.trim()) { emailRef.current?.focus(); return fail('Email is required.'); }
    if (!emailValid) { emailRef.current?.focus(); return fail('Enter a valid email address.'); }
    if (!password) { pwRef.current?.focus(); return fail('Password is required.'); }
    if (mfaRequired && !/^\d{6}$/.test(mfaCode.trim())) return fail('Enter the 6-digit code from your authenticator app.');
    if (busy) return;
    setBusy(true);
    try {
      await login(email.trim(), password, mfaRequired ? mfaCode.trim() : undefined);
      persistRemember({ email: email.trim(), organization_name: lastOrg });
      setOk(true); // brief success flash before redirect fires
    } catch (err: unknown) {
      // The server challenges 2FA-enabled accounts with { mfaRequired: true }.
      const payload = (err && typeof err === 'object' && 'payload' in err)
        ? (err as { payload?: { mfaRequired?: boolean } }).payload : undefined;
      if (payload?.mfaRequired) {
        setMfaRequired(true);
        setBusy(false);
        fail(mfaCode.trim() ? 'That code was incorrect. Try again.' : '');
        return;
      }
      fail(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    }
  }

  async function handlePasskey() {
    if (passkeyBusy || busy) return;
    setError('');
    setPasskeyBusy(true);
    try {
      await loginWithPasskey(email.trim() || undefined);
      setOk(true);
    } catch (err: unknown) {
      fail(webAuthnError(err));
    }
  }

  async function handleGoogle(res: CredentialResponse) {
    if (!res.credential) return;
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle(res.credential);
      setOk(true);
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
    }
  }

  const onPwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'));
  };

  // Full-page auth-check splash
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: '#fff' }}>
        <div className="flex flex-col items-center gap-5">
          <m.div animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <Wordmark size={44} />
          </m.div>
          <Loader2 className="animate-spin" size={20} style={{ color: MAROON }} />
        </div>
      </div>
    );
  }

  const showDivider = !!GOOGLE_CLIENT_ID || passkeyReady;

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(120% 78% at 50% -8%, #F8FAFC 0%, #ffffff 48%)',
        color: INK,
        fontFamily: "var(--font-sans), 'Inter', system-ui, sans-serif",
        // Guarantee the logo clears the status bar / notch even when
        // env(safe-area-inset-top) resolves to 0 (some in-app browsers /
        // non-cover viewports): floor the notch reserve at 2.75rem.
        paddingTop: 'calc(max(env(safe-area-inset-top), 2.75rem) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
      }}
    >
      {/* ambient wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}18, transparent 68%)` }} />
        <div className="absolute -bottom-28 -left-20 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${MAROON}10, transparent 68%)` }} />
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[12.5px] font-[600] backdrop-blur transition-colors hover:bg-white"
        style={{ color: MUTE, border: `1px solid ${LINE}`, top: 'calc(max(env(safe-area-inset-top), 2.75rem) + 0.5rem)' }}
      >
        <ArrowLeft size={13} /> Home
      </Link>

      <m.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        {/* Centered logo + heading (Apple style) */}
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogoWide width={224} priority />
          <h1 className="mt-4 text-[27px] font-[840] tracking-[-0.025em]" style={{ color: INK }}>Sign in</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: MUTE }}>
            Welcome back to MY PT STUDIO{lastOrg ? <> · <span className="font-[650]" style={{ color: MAROON }}>{lastOrg}</span></> : ''}.
          </p>
        </div>

        <m.div
          key={shakeKey}
          animate={shakeKey > 0 && !reduce ? { x: [0, -9, 8, -6, 4, 0] } : undefined}
          transition={{ duration: 0.42 }}
          className="rounded-3xl bg-white p-7 sm:p-8"
          style={{ border: `1px solid ${LINE}`, boxShadow: '0 30px 70px -34px rgba(15,23,42,0.28), 0 4px 14px rgba(15,23,42,0.04)' }}
        >

            {/* remembered-account chip */}
            {rememberedEmail && (
              <button
                type="button"
                onClick={() => { setEmail(rememberedEmail); pwRef.current?.focus(); }}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-black/[0.02]"
                style={{ border: `1px solid ${LINE}` }}
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[13px] font-[800] text-white" style={{ background: `linear-gradient(135deg, ${MAROON}, ${MAROON_DEEP})` }}>
                  {rememberedEmail.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-[600]" style={{ color: MUTE }}>Continue as</span>
                  <span className="block truncate text-[14px] font-[700]" style={{ color: INK }}>{rememberedEmail}</span>
                </span>
                <ArrowRight size={16} style={{ color: MAROON }} />
              </button>
            )}

            {/* error banner */}
            <AnimatePresence>
              {error && (
                <m.div
                  role="alert"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 20 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5 overflow-hidden rounded-xl px-3.5 py-3"
                  style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.22)' }}
                >
                  <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span className="text-[13px] font-[550]" style={{ color: '#B91C1C', lineHeight: 1.4 }}>{error}</span>
                </m.div>
              )}
            </AnimatePresence>

            {/* form */}
            <form onSubmit={submit} noValidate className="mt-6">
              {/* email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[12px] font-[650] tracking-[0.02em]" style={{ color: INK }}>Email address</label>
                <div className="relative">
                  <input
                    id="email" ref={emailRef} type="email" inputMode="email" autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => { setFocused(null); setTouched((t) => ({ ...t, email: true })); }}
                    placeholder="you@studio.com"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-err' : undefined}
                    className="w-full rounded-xl bg-white text-[14.5px] outline-none transition-all"
                    style={{
                      height: 52, paddingLeft: 42, paddingRight: 14, color: INK,
                      border: `1px solid ${emailError ? 'rgba(220,38,38,0.55)' : focused === 'email' ? MAROON : LINE}`,
                      boxShadow: focused === 'email' && !emailError ? `0 0 0 3px ${MAROON}1A` : emailError ? '0 0 0 3px rgba(220,38,38,0.10)' : 'none',
                    }}
                  />
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'email' ? MAROON : MUTE, opacity: focused === 'email' ? 1 : 0.55 }} />
                </div>
                <AnimatePresence>
                  {emailError && (
                    <m.p id="email-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-[12px] font-[550]" style={{ color: '#DC2626' }}>{emailError}</m.p>
                  )}
                </AnimatePresence>
              </div>

              {/* password */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-[12px] font-[650] tracking-[0.02em]" style={{ color: INK }}>Password</label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-[12px] font-[650] transition-colors hover:underline" style={{ color: MAROON }}>Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    id="password" ref={pwRef} type={showPw ? 'text' : 'password'} autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => { setFocused(null); setTouched((t) => ({ ...t, password: true })); setCapsOn(false); }}
                    onKeyUp={onPwKey}
                    onKeyDown={onPwKey}
                    placeholder="••••••••••"
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'pw-err' : undefined}
                    className="w-full rounded-xl bg-white text-[14.5px] outline-none transition-all"
                    style={{
                      height: 52, paddingLeft: 42, paddingRight: 46, color: INK,
                      border: `1px solid ${passwordError ? 'rgba(220,38,38,0.55)' : focused === 'password' ? MAROON : LINE}`,
                      boxShadow: focused === 'password' && !passwordError ? `0 0 0 3px ${MAROON}1A` : passwordError ? '0 0 0 3px rgba(220,38,38,0.10)' : 'none',
                    }}
                  />
                  <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'password' ? MAROON : MUTE, opacity: focused === 'password' ? 1 : 0.55 }} />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition-colors hover:bg-black/[0.04]"
                    style={{ color: MUTE }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <m.span key={showPw ? 'off' : 'on'} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.14 }} className="grid place-items-center">
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </m.span>
                    </AnimatePresence>
                  </button>
                </div>
                <AnimatePresence>
                  {passwordError && (
                    <m.p id="pw-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-[12px] font-[550]" style={{ color: '#DC2626' }}>{passwordError}</m.p>
                  )}
                  {capsOn && !passwordError && (
                    <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 flex items-center gap-1.5 text-[12px] font-[600]" style={{ color: '#B45309' }}>
                      <AlertTriangle size={13} /> Caps Lock is on
                    </m.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Two-factor code — appears when the server challenges a 2FA account */}
              <AnimatePresence>
                {mfaRequired && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <label htmlFor="mfa" className="mb-1.5 block text-[13px] font-[600]" style={{ color: INK }}>
                      Authentication code
                    </label>
                    <input
                      id="mfa"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      autoFocus
                      className="w-full rounded-xl bg-white text-center text-[20px] font-[700] tracking-[0.4em] outline-none transition-all"
                      style={{ height: 52, color: INK, border: `1px solid ${MAROON}`, boxShadow: `0 0 0 3px ${MAROON}1A` }}
                    />
                    <p className="mt-1.5 text-[12px]" style={{ color: MUTE }}>
                      Enter the 6-digit code from your authenticator app.
                    </p>
                  </m.div>
                )}
              </AnimatePresence>

              {/* remember me */}
              <label className="mt-4 flex cursor-pointer select-none items-center gap-2.5">
                <span className="relative grid place-items-center">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                  <span
                    className="grid h-[18px] w-[18px] place-items-center rounded-[6px] transition-all"
                    style={{ border: `1.5px solid ${remember ? MAROON : LINE}`, background: remember ? MAROON : '#fff' }}
                  >
                    {remember && <Check size={12} strokeWidth={3} className="text-white" />}
                  </span>
                </span>
                <span className="text-[13px] font-[550]" style={{ color: MUTE }}>Keep me signed in on this device</span>
              </label>

              {/* The reset flow existed on the backend but had no way in from
                  the UI, so a locked-out user had to ask an admin. */}
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-[13px] font-[650]" style={{ color: MAROON }}>
                  Forgot password?
                </Link>
              </div>

              {/* submit */}
              <m.button
                type="submit"
                disabled={busy || ok}
                whileHover={!busy && !ok && !reduce ? { y: -1.5 } : undefined}
                whileTap={!busy && !ok && !reduce ? { scale: 0.99 } : undefined}
                className="relative mt-6 flex h-[54px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-full text-[15px] font-[720] text-white"
                style={{
                  background: ok ? 'linear-gradient(135deg, #059669, #047857)' : `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%)`,
                  boxShadow: busy || ok ? 'none' : `0 16px 36px ${MAROON}44`,
                  cursor: busy || ok ? 'default' : 'pointer',
                  opacity: busy ? 0.92 : 1,
                  transition: 'background 300ms ease, box-shadow 300ms ease',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {ok ? (
                    <m.span key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                      <Check size={18} strokeWidth={3} /> Signed in
                    </m.span>
                  ) : busy ? (
                    <m.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                      <Loader2 size={17} className="animate-spin" /> Signing in…
                    </m.span>
                  ) : (
                    <m.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      Sign in <ArrowRight size={17} strokeWidth={2.5} />
                    </m.span>
                  )}
                </AnimatePresence>
              </m.button>

              {/* divider */}
              {showDivider && (
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1" style={{ background: LINE }} />
                  <span className="text-[11px] font-[600] uppercase tracking-[0.14em]" style={{ color: MUTE }}>or continue with</span>
                  <span className="h-px flex-1" style={{ background: LINE }} />
                </div>
              )}

              {/* Google */}
              {GOOGLE_CLIENT_ID && (
                <div ref={googleWrapRef} className="flex justify-center overflow-hidden [color-scheme:light]">
                  <GoogleLogin onSuccess={handleGoogle} onError={() => fail('Google sign-in was cancelled or failed.')} theme="outline" size="large" shape="rectangular" text="signin_with" logo_alignment="left" width={String(googleW)} />
                </div>
              )}

              {/* Passkey */}
              {passkeyReady && (
                <m.button
                  type="button"
                  onClick={handlePasskey}
                  disabled={passkeyBusy || busy || ok}
                  whileHover={!passkeyBusy && !reduce ? { y: -1 } : undefined}
                  whileTap={!passkeyBusy && !reduce ? { scale: 0.99 } : undefined}
                  className="mt-3 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-full text-[14px] font-[700] transition-colors"
                  style={{ color: MAROON, background: `${MAROON}08`, border: `1px solid ${MAROON}2E`, cursor: passkeyBusy ? 'default' : 'pointer' }}
                >
                  {passkeyBusy ? <><Loader2 size={17} className="animate-spin" /> Waiting for biometric…</> : <><Fingerprint size={18} /> Sign in with Face ID / Fingerprint</>}
                </m.button>
              )}
            </form>
          </m.div>

          {/* trust strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2 text-[11px] font-[600]" style={{ color: MUTE }}>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Lock size={12} style={{ color: MAROON }} /> 256-bit encryption</span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><ShieldCheck size={12} style={{ color: MAROON }} /> Session protection</span>
            {passkeyReady && <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Fingerprint size={12} style={{ color: MAROON }} /> Biometric ready</span>}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Building2 size={12} style={{ color: MAROON }} /> Multi-tenant isolation</span>
          </div>

          <p className="mt-5 text-center text-[11.5px]" style={{ color: MUTE }}>
            © {new Date().getFullYear()} MY PT STUDIO · Need help?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-[650] hover:underline" style={{ color: MAROON }}>Contact support</a>
          </p>
      </m.div>

      <ForgotModal open={forgotOpen} onClose={() => setForgotOpen(false)} prefillEmail={email.trim()} />
    </div>
  );
}
