'use client';

/**
 * MY PT STUDIO — the sign-in doors (Trainer Login, Member Login, Command Center).
 *
 * Built on the shared signed-out frame (components/landing/AuthShell): the
 * studio object — the brand cube in real 3D — on the left with what this door
 * is for, and the form on the right. The same frame carries Start Free and
 * password recovery, so moving between them does not feel like changing site.
 *
 * Everything on this screen is wired to something real: password sign-in, the
 * 2FA challenge (TOTP or recovery code), and passkey / Face ID / fingerprint
 * when the device has a platform authenticator. There is no sample data and no
 * list of security badges — the page does not claim anything it cannot show.
 *
 * Google sign-in is deliberately not offered here. The provider and
 * `loginWithGoogle` stay in auth-context, so bringing it back is a UI change
 * only.
 *
 * "Forgot password?" goes to /forgot-password, the self-serve reset. It used
 * to open a modal saying resets were issued by your studio's trainer, from
 * before that endpoint had a way in from the UI.
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';
import { Wordmark } from '@/components/landing/Wordmark';
import AuthShell, { AuthCard, StageBackdrop, type AuthAside } from '@/components/landing/AuthShell';
import AuthInput, { RevealButton } from '@/components/landing/AuthField';
import { C, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/landing/tokens';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, ArrowRight, Fingerprint, Loader2, Lock, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { rememberKeys, portalForRole, postSignInPath, safeReturnTo, type Portal } from '@/lib/portals';
import { isWebAuthnSupported, isBiometricAvailable, webAuthnError } from '@/hooks/useWebAuthn';
import { errorMessage, mapSignInError } from '@/lib/forms/errors';
import { signInSchema } from '@/lib/forms/schemas/auth';

const SUPPORT_EMAIL = 'help@myptstudio.app';

/**
 * The sign-in identifier's rule, from the schema layer.
 *
 * `signInSchema` mirrors what `lib/validation.js` enforces on the login body,
 * so the box and the endpoint agree by construction rather than by two regexes
 * happening to match.
 */
function isValidSignInEmail(value: string): boolean {
  return signInSchema.shape.email.safeParse(value).success;
}

export type { Portal };

const COPY: Record<
  Portal,
  {
    title: string;
    blurb: string;
    otherHref: string;
    otherLabel: string;
    otherCta: string;
    aside: AuthAside;
  }
> = {
  trainer: {
    title: 'Trainer Login',
    blurb: 'For the trainer who runs the studio.',
    otherHref: '/member-login',
    otherLabel: 'Are you a member? Member Login',
    otherCta: 'Member Login',
    aside: {
      eyebrow: 'Trainer login · MY PT STUDIO',
      headline: 'Your studio, exactly where you left it.',
      sub: 'Clients, programmes, sessions, payments and renewals — the whole personal-training business in one place, with AI drafting the admin for you to approve.',
      notes: [
        'Every client’s history in one profile',
        'Programmes you build, or AI drafts — you approve',
        'Dues and renewals flagged before they lapse',
      ],
    },
  },
  member: {
    title: 'Member Login',
    blurb: 'For clients training with a studio.',
    otherHref: '/login',
    otherLabel: 'Running a studio? Trainer Login',
    otherCta: 'Trainer Login',
    aside: {
      eyebrow: 'Member login · MY PT STUDIO',
      headline: 'Your training, from your studio.',
      sub: 'Your membership, payments, attendance and measurements — kept by your studio, on any device you sign in from.',
      notes: [
        'Only your own records — never another member’s',
        'Payments and receipts from your studio',
        'Measurements and attendance over time',
      ],
    },
  },
  // The Command Center door. `otherHref` points back at the studio sign-in so
  // somebody who lands here by mistake has a way out; there is deliberately no
  // link pointing INTO this page from either of the others, because the only
  // people who should know it exists already do.
  platform: {
    title: 'Command Center',
    blurb: 'Platform operations. Authorized operators only.',
    otherHref: '/login',
    otherLabel: 'Running a studio? Trainer Login',
    otherCta: 'Trainer Login',
    aside: {
      eyebrow: 'Command Center · MY PT STUDIO',
      headline: 'Platform operations.',
      sub: 'Studio approvals, plans and platform health. Authorized operators only.',
    },
  },
};

const MAIN_PADDING = {
  paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
  paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
} as const;

export default function SignInScreen({ portal = 'trainer' }: { portal?: Portal }) {
  const copy = COPY[portal];
  const LS = rememberKeys(portal);
  // Set when the server says the credentials were right but this is the wrong
  // sign-in page. Turns the error box into a way out rather than a wall.
  const [wrongPortal, setWrongPortal] = useState(false);
  const { user, login, loginWithPasskey, logout, loading } = useAuth();
  const router = useRouter();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);

  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  // Second factor: shown after the server challenges a 2FA-enabled account.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [capsOn, setCapsOn] = useState(false);

  const [lastOrg, setLastOrg] = useState<string | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState<string>('');

  const [passkeyReady, setPasskeyReady] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  /**
   * Whether a sign-in attempt is already running.
   *
   * A ref rather than the `busy` state because it is read synchronously at the
   * top of `submit`: a state update is not visible to a second submit in the
   * same tick, which is exactly the case this exists to stop.
   */
  const inFlight = useRef(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mfaRef = useRef<HTMLInputElement>(null);

  // Move focus to the code box when the server asks for it — an effect rather
  // than autoFocus, so it happens when the challenge appears, not on mount.
  useEffect(() => {
    if (mfaRequired) mfaRef.current?.focus();
  }, [mfaRequired]);

  // Device passkey capability
  useEffect(() => {
    if (isWebAuthnSupported()) isBiometricAvailable().then(setPasskeyReady);
  }, []);

  // Restore remembered account
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(LS.email) ?? '';
      const rememberPref = localStorage.getItem(LS.remember);
      setLastOrg(localStorage.getItem(LS.org));
      if (savedEmail && rememberPref !== '0') {
        setRememberedEmail(savedEmail);
        setEmail(savedEmail);
        setRemember(true);
      }
    } catch { /* private mode */ }
  }, [LS.email, LS.remember, LS.org]);

  // Which portal the session already in this browser belongs to. The auth
  // cookie is one per browser, not one per sign-in page, so a trainer who was
  // already signed in here IS the session /api/auth/me resolves when a client
  // opens Member Login on the same device.
  const sessionPortal: Portal | null = user ? portalForRole(user.role) : null;
  const foreignSession = sessionPortal !== null && sessionPortal !== portal;

  // Redirect once authenticated (role-aware) — but only into the portal this
  // page is the door to.
  //
  // Without the foreignSession guard a client who opened /member-login on a
  // device their trainer had used was sent straight into the trainer's app by
  // the trainer's still-valid cookie, without touching the form — and a member
  // session on /login was thrown at /member/dashboard.
  useEffect(() => {
    if (loading || !user || foreignSession) return;
    // safeReturnTo honours the `?redirect=` that proxy.ts writes onto this URL
    // when it bounces an expired session, and falls back to postSignInPath for
    // anything it will not follow. Read from window rather than
    // useSearchParams, which would opt the prerendered screen out of static
    // rendering; the effect is client-only, so `window` is always there.
    const returnTo =
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('redirect');
    router.replace(safeReturnTo(returnTo, user.role));
  }, [user, loading, foreignSession, router]);

  const emailValid = isValidSignInEmail(email);
  const emailError = touched.email && !email.trim() ? 'Email is required.' : touched.email && !emailValid ? 'Enter a valid email address.' : '';
  const passwordError = touched.password && !password ? 'Password is required.' : '';

  function persistRemember(u: { email: string; organization_name?: string | null }) {
    try {
      if (remember) {
        localStorage.setItem(LS.email, u.email);
        localStorage.setItem(LS.remember, '1');
        if (u.organization_name) localStorage.setItem(LS.org, u.organization_name);
      } else {
        localStorage.setItem(LS.remember, '0');
        localStorage.removeItem(LS.email);
        localStorage.removeItem(LS.org);
      }
    } catch { /* noop */ }
  }

  function fail(msg: string) {
    setError(msg);
    setShakeKey((k) => k + 1);
    setBusy(false);
    setPasskeyBusy(false);
    inFlight.current = false;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    setWrongPortal(false);
    if (!email.trim()) { emailRef.current?.focus(); return fail('Email is required.'); }
    if (!emailValid) { emailRef.current?.focus(); return fail('Enter a valid email address.'); }
    if (!password) { pwRef.current?.focus(); return fail('Password is required.'); }
    // A 6-digit TOTP, or a recovery code (10 Crockford-base32 characters,
    // conventionally shown as XXXXX-XXXXX). Deliberately permissive about
    // separators and case — this is typed off paper by somebody who has lost
    // their phone — and the server is what actually decides.
    if (mfaRequired) {
      const entered = mfaCode.trim();
      const isTotp = /^\d{6}$/.test(entered);
      const isRecovery = /^[0-9A-Za-z]{10}$/.test(entered.replace(/[\s-]/g, ''));
      if (!isTotp && !isRecovery) {
        return fail('Enter the 6-digit code from your authenticator app, or a recovery code.');
      }
    }
    // A ref, not the `busy` state. Two submits dispatched in the same frame —
    // a double-tap, a held Enter, a screen reader firing the default action
    // twice — read the SAME render closure, so both see `busy === false` and
    // both post. Sign-in is rate-limited server-side and a second attempt is
    // counted against that limit, so the duplicate is not free.
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await login(email.trim(), password, mfaRequired ? mfaCode.trim() : undefined, portal);
      persistRemember({ email: email.trim(), organization_name: lastOrg });
      // Deliberately NOT releasing the in-flight ref here: the redirect is
      // already on its way.
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
      // Right password, wrong door. The server only ever says this once the
      // password has checked out, so it is safe to be specific.
      if ((err as { status?: number })?.status === 403
          && (err as { code?: string })?.code === 'WRONG_PORTAL') {
        setWrongPortal(true);
        fail(errorMessage(err, 'Wrong sign-in page for this account.'));
        return;
      }
      fail(mapSignInError(err, 'Login failed. Please check your credentials.'));
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

  const onPwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'));
  };

  // Full-page auth-check splash
  if (loading) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center" style={{ background: C.canvas }}>
        <StageBackdrop />
        <div className="relative flex flex-col items-center gap-5">
          <m.div animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <Wordmark size={44} />
          </m.div>
          <Loader2 className="animate-spin" size={20} style={{ color: C.blueHi }} />
          <span className="sr-only">Checking your session…</span>
        </div>
      </div>
    );
  }

  // Somebody else's session is open in this browser. Do not sign them out
  // silently and do not walk into their app — say whose session it is and make
  // leaving it a deliberate tap. The name here is the browser's own session,
  // not a lookup, so there is nothing to leak by showing it.
  if (foreignSession && user) {
    const otherLabel = sessionPortal === 'member'
      ? 'a member account'
      : sessionPortal === 'platform'
        ? 'a Command Center account'
        : 'a trainer account';
    return (
      <div
        className="relative flex min-h-[100dvh] flex-col items-center justify-center"
        style={{
          background: C.canvas,
          color: C.body,
          fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
          paddingTop: PUBLIC_NAV_CLEARANCE,
          ...MAIN_PADDING,
        }}
      >
        <PublicNav action="start-free" />
        <StageBackdrop />
        <div className="relative z-10 w-full max-w-[420px]">
          <AuthCard title={copy.title}>
            <div className="mt-6 flex items-center gap-3.5 rounded-[16px] border px-4 py-3.5" style={{ borderColor: 'rgba(31,42,61,0.10)', background: 'rgba(255,255,255,0.6)' }}>
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[16px] font-[800] text-white"
                style={{ background: `linear-gradient(180deg, ${C.blue450}, ${C.blueLo})` }}
              >
                {(user.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <p className="text-[15px] font-[720] leading-snug" style={{ color: C.ink }}>
                This device is signed in as {user.name}
              </p>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed" style={{ color: C.muted }}>
              That is {otherLabel}, so it can&rsquo;t sign in here. Sign it out to
              continue on {copy.title}.
            </p>
            <button type="button" onClick={() => logout()} className={`${PRIMARY_BUTTON} mt-6 h-[54px] w-full text-[15px]`}>
              Sign out and continue <ArrowRight size={17} />
            </button>
            <Link
              href={postSignInPath(user.role)}
              className={`${SECONDARY_BUTTON} mt-3 h-12 w-full text-[14px]`}
            >
              Stay signed in as {user.name}
            </Link>
          </AuthCard>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      nav={<PublicNav action="start-free" />}
      mainStyle={{ paddingTop: PUBLIC_NAV_CLEARANCE, ...MAIN_PADDING }}
      aside={copy.aside}
    >
      <m.div
        key={shakeKey}
        animate={shakeKey > 0 && !reduce ? { x: [0, -9, 8, -6, 4, 0] } : undefined}
        transition={{ duration: 0.42 }}
      >
        <AuthCard
          title={copy.title}
          subtitle={
            <>
              {copy.blurb}
              {lastOrg ? <> · <span className="font-[650]" style={{ color: C.blueHi }}>{lastOrg}</span></> : null}
            </>
          }
          footer={
            <>
              {/* The other door. Two separate sign-ins only work if each one
                  says where the other is — "wrong page" on its own is a dead end. */}
              <div className="mt-5 text-center">
                <Link
                  href={copy.otherHref}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-[650] transition-colors hover:bg-[rgba(31,42,61,0.05)]"
                  style={{ color: C.body }}
                >
                  {copy.otherLabel}
                  <ArrowRight size={14} />
                </Link>
              </div>
              <p className="mt-3 text-center text-[12px]" style={{ color: C.muted }}>
                © {new Date().getFullYear()} MY PT STUDIO · Need help?{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-[650] hover:underline" style={{ color: C.blueHi }}>Contact support</a>
              </p>
            </>
          }
        >
          {/* remembered-account chip */}
          {rememberedEmail && (
            <button
              type="button"
              onClick={() => { setEmail(rememberedEmail); pwRef.current?.focus(); }}
              className="mt-6 flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,103,224,0.22)]"
              style={{ borderColor: 'rgba(31,42,61,0.10)', background: 'rgba(255,255,255,0.55)' }}
            >
              <span
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[13px] font-[800] text-white"
                style={{ background: `linear-gradient(180deg, ${C.blue450}, ${C.blueLo})` }}
              >
                {rememberedEmail.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-[600]" style={{ color: C.muted }}>Continue as</span>
                <span className="block truncate text-[14px] font-[700]" style={{ color: C.ink }}>{rememberedEmail}</span>
              </span>
              <ArrowRight size={16} style={{ color: C.blueHi }} />
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
                className="flex items-start gap-2.5 overflow-hidden rounded-[14px] px-3.5 py-3"
                style={{ background: C.redSoft, border: '1px solid rgba(183,28,28,0.22)' }}
              >
                <AlertTriangle size={16} className="mt-px shrink-0" style={{ color: C.red }} />
                <span className="text-[13.5px] font-[560] leading-[1.45]" style={{ color: C.red }}>
                  {error}
                  {wrongPortal && (
                    <>
                      {' '}
                      <Link href={copy.otherHref} className="font-[750] underline underline-offset-2">
                        Go to {copy.otherCta}
                      </Link>
                    </>
                  )}
                </span>
              </m.div>
            )}
          </AnimatePresence>

          <form data-no-pull-refresh onSubmit={submit} noValidate className="mt-6 space-y-5">
            <AuthInput
              label="Email address"
              icon={Mail}
              inputRef={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="you@studio.com"
              error={emailError}
            />

            <AuthInput
              label="Password"
              icon={Lock}
              inputRef={pwRef}
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => { setTouched((t) => ({ ...t, password: true })); setCapsOn(false); }}
              onKeyUp={onPwKey}
              onKeyDown={onPwKey}
              placeholder="Your password"
              error={passwordError}
              hint={capsOn ? 'Caps Lock is on.' : undefined}
              labelAside={
                // The reset flow existed on the backend but had no way in from
                // the UI, so a locked-out user had to ask an admin.
                <Link href="/forgot-password" className="text-[13px] font-[650] hover:underline" style={{ color: C.blueHi }}>
                  Forgot password?
                </Link>
              }
              trailing={<RevealButton shown={showPw} onToggle={() => setShowPw((s) => !s)} />}
            />

            {/* Two-factor code — appears when the server challenges a 2FA account */}
            <AnimatePresence>
              {mfaRequired && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {/*
                    Accepts a 6-digit TOTP OR a recovery code: letters, spaces
                    and the hyphen pass through, and the server normalises case
                    and separators before comparing. inputMode stays numeric —
                    the 6-digit code is the common case — but it is a hint, not
                    a filter, so a recovery code can still be typed or pasted.
                  */}
                  <AuthInput
                    label="Authentication code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={14}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9A-Za-z\s-]/g, '').slice(0, 14))}
                    placeholder="123456"
                    inputRef={mfaRef}
                    hint="Enter the 6-digit code from your authenticator app, or one of your recovery codes."
                  />
                </m.div>
              )}
            </AnimatePresence>

            {/* remember me */}
            <label className="flex cursor-pointer select-none items-center gap-2.5">
              <span className="relative grid place-items-center">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                <span
                  aria-hidden
                  className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(0,103,224,0.22)]"
                  style={{
                    borderColor: remember ? C.blue : 'rgba(31,42,61,0.28)',
                    background: remember ? C.blue : 'rgba(255,255,255,0.8)',
                  }}
                >
                  {remember && <Check size={12} strokeWidth={3} className="text-white" />}
                </span>
              </span>
              <span className="text-[13.5px] font-[560]" style={{ color: C.body }}>Keep me signed in on this device</span>
            </label>

            {/* submit */}
            <button
              type="submit"
              disabled={busy || ok}
              className={`${PRIMARY_BUTTON} h-[54px] w-full text-[15px]`}
              style={ok ? { background: C.emerald } : undefined}
            >
              <AnimatePresence mode="wait" initial={false}>
                {ok ? (
                  <m.span key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                    <Check size={18} strokeWidth={3} /> Signed in
                  </m.span>
                ) : busy ? (
                  <m.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                    <Loader2 size={17} className="animate-spin" /> Signing in…
                  </m.span>
                ) : (
                  <m.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    Log In <ArrowRight size={17} strokeWidth={2.5} />
                  </m.span>
                )}
              </AnimatePresence>
            </button>

            {/* Passkey — only on a device with a platform authenticator */}
            {passkeyReady && (
              <>
                <div className="flex items-center gap-3" aria-hidden>
                  <span className="h-px flex-1" style={{ background: 'rgba(31,42,61,0.12)' }} />
                  <span className="text-[11px] font-[600] uppercase tracking-[0.14em]" style={{ color: C.muted }}>or</span>
                  <span className="h-px flex-1" style={{ background: 'rgba(31,42,61,0.12)' }} />
                </div>
                <button
                  type="button"
                  onClick={handlePasskey}
                  disabled={passkeyBusy || busy || ok}
                  className={`${SECONDARY_BUTTON} h-[50px] w-full text-[14px] disabled:opacity-70`}
                >
                  {passkeyBusy
                    ? <><Loader2 size={17} className="animate-spin" /> Waiting for biometric…</>
                    : <><Fingerprint size={18} style={{ color: C.blueHi }} /> Sign in with Face ID / Fingerprint</>}
                </button>
              </>
            )}
          </form>
        </AuthCard>
      </m.div>
    </AuthShell>
  );
}
