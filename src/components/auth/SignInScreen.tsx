'use client';

/**
 * MY PT STUDIO — authentication experience.
 *
 * The same dark, premium surface as the marketing site: a near-black navy
 * canvas with the MY PT STUDIO brand panel on the left (positioning, what the
 * platform runs, a quiet product strip) and a glass auth card on the right.
 * Built on the landing design tokens (src/components/landing/tokens.ts), so
 * signing in does not feel like leaving the product you just read about.
 *
 * Everything here is wired to real auth: password, Google (when a client id is
 * configured) and passkey / Face ID / fingerprint (when the device supports a
 * platform authenticator). We deliberately do NOT render buttons for providers
 * that have no backend (Apple, magic-link) — no dead UI. "Forgot password?"
 * goes to /forgot-password, the self-serve reset. It used to open a modal
 * saying resets were issued by your studio's trainer, from before that
 * endpoint had a way in from the UI; the two shipped side by side for a while
 * and the page offered the same thing twice, once truthfully.
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';
import { Wordmark } from '@/components/landing/Wordmark';
import { C, EASE, SHADOW } from '@/components/landing/tokens';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, ArrowRight, Fingerprint, Loader2, Lock,
  ShieldCheck, Check, AlertTriangle, Building2, Users, Dumbbell, Sparkles,
} from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/lib/auth-context';
import { rememberKeys, portalForRole, postSignInPath, type Portal } from '@/lib/portals';
import { roleLabel } from '@/lib/roles';
import { isWebAuthnSupported, isBiometricAvailable, webAuthnError } from '@/hooks/useWebAuthn';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SUPPORT_EMAIL = 'help@myptstudio.app';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ══════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════

export type { Portal };

const COPY: Record<
  Portal,
  {
    title: string;
    blurb: string;
    otherHref: string;
    otherLabel: string;
    otherCta: string;
    panel: { eyebrow: string; headline: string; sub: string; points: string[] };
  }
> = {
  staff: {
    title: 'Admin Login',
    blurb: 'For trainers and studio owners.',
    otherHref: '/member-login',
    otherLabel: 'Are you a member? Member Login',
    otherCta: 'Member Login',
    panel: {
      eyebrow: 'Personal Training Business Management',
      headline: 'Run your PT business. Train your clients. Let AI handle the admin.',
      sub: 'Clients, training plans, billing and renewals in one place — with AI doing the paperwork.',
      points: [
        'Clients, plans, billing and renewals — one platform',
        'AI drafts check-ins, follow-ups and session notes',
        'Works across devices, in the gym and out',
      ],
    },
  },
  member: {
    title: 'Member Login',
    blurb: 'For clients training with a studio.',
    otherHref: '/login',
    otherLabel: 'Studio owner or trainer? Admin Login',
    otherCta: 'Admin Login',
    panel: {
      eyebrow: 'MY PT STUDIO · Member Portal',
      headline: 'Your training, all in one place.',
      sub: 'Programmes, sessions and progress from your studio — on any device.',
      points: [
        "Your trainer's programmes and plans",
        'Check-ins, measurements and progress',
        'Session updates from your studio',
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
    otherLabel: 'Studio owner or trainer? Admin Login',
    otherCta: 'Admin Login',
    panel: {
      eyebrow: 'Command Center',
      headline: 'Platform operations, one pane of glass.',
      sub: 'Authorized operators only.',
      points: [
        'Studio approvals, health and lifecycles',
        'Strict tenant isolation on every query',
        'Audit trail on every operation',
      ],
    },
  },
};

/** Decorative strip for the brand panel — same role as the landing mockups. */
function MiniProduct() {
  const rows = [
    { icon: <Users size={15} />, t: 'Client roster', chip: 'On track', c: C.blueHi },
    { icon: <Dumbbell size={15} />, t: 'Training plans', chip: 'Synced', c: C.gold },
    { icon: <Sparkles size={15} />, t: 'AI admin', chip: 'Drafting', c: C.emerald },
  ];
  return (
    <div
      aria-hidden
      className="mt-9 max-w-[460px] rounded-2xl border p-3.5"
      style={{ background: C.panel, borderColor: C.line, boxShadow: SHADOW.card }}
    >
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: C.panelAlt }}>
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${C.blue}14`, color: r.c }}>
              {r.icon}
            </span>
            <span className="text-[13px] font-[600]" style={{ color: C.body }}>{r.t}</span>
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-[700] tracking-[0.04em]"
              style={{ background: `${r.c}1a`, color: r.c }}
            >
              {r.chip}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignInScreen({ portal = 'staff' }: { portal?: Portal }) {
  const copy = COPY[portal];
  const LS = rememberKeys(portal);
  // Set when the server says the credentials were right but this is the wrong
  // sign-in page. Turns the error box into a way out rather than a wall.
  const [wrongPortal, setWrongPortal] = useState(false);
  const { user, login, loginWithGoogle, loginWithPasskey, logout, loading } = useAuth();
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
  // Without the foreignSession guard this effect was the reported bug: a client
  // opened /member-login on a device their trainer had used, the trainer's
  // still-valid cookie resolved, and this fired router.replace('/pt-os') — the
  // client got the trainer's app, instantly, without touching the form. The
  // reverse held too: a member session on /login was thrown at
  // /member/dashboard. Neither is a data leak (the server answers the session
  // it is given, and it was genuinely the trainer's session) but it is exactly
  // what "the trainer's profile opens inside the client's" looks like, and no
  // amount of care on the server can fix it from here.
  useEffect(() => {
    if (loading || !user || foreignSession) return;
    // postSignInPath rather than a role ladder here. The ladder had no case for
    // a platform operator, so they fell through its `else` and landed in the
    // studio app after signing in at the Command Center's own door. See
    // lib/portals.ts for why this moved out of the component.
    router.replace(postSignInPath(user.role));
  }, [user, loading, foreignSession, router]);

  const emailValid = EMAIL_RE.test(email.trim());
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
    // conventionally shown as XXXXX-XXXXX). This guard used to accept only
    // the first shape, which blocked the recovery path here even once the
    // server understood it. Deliberately permissive about separators and
    // case — this is typed off paper by somebody who has lost their phone —
    // and the server is what actually decides.
    if (mfaRequired) {
      const entered = mfaCode.trim();
      const isTotp = /^\d{6}$/.test(entered);
      const isRecovery = /^[0-9A-Za-z]{10}$/.test(entered.replace(/[\s-]/g, ''));
      if (!isTotp && !isRecovery) {
        return fail('Enter the 6-digit code from your authenticator app, or a recovery code.');
      }
    }
    if (busy) return;
    setBusy(true);
    try {
      await login(email.trim(), password, mfaRequired ? mfaCode.trim() : undefined, portal);
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
      // Right password, wrong door. The server only ever says this once the
      // password has checked out, so it is safe to be specific — and being
      // specific is the point: "invalid credentials" would send somebody off
      // to reset a password that was never wrong.
      if ((err as { status?: number })?.status === 403
          && (err as { code?: string })?.code === 'WRONG_PORTAL') {
        setWrongPortal(true);
        fail(err instanceof Error ? err.message : 'Wrong sign-in page for this account.');
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
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: C.canvas }}>
        <div className="flex flex-col items-center gap-5">
          <m.div animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <Wordmark size={44} />
          </m.div>
          <Loader2 className="animate-spin" size={20} style={{ color: C.blueHi }} />
        </div>
      </div>
    );
  }

  // Somebody else's session is open in this browser. Do not sign them out
  // silently and do not walk into their app — say whose session it is and make
  // leaving it a deliberate tap. The name here is the browser's own session,
  // not a lookup, so there is nothing to leak by showing it.
  if (foreignSession && user) {
    // Phrased so it needs no indefinite article — "a trainer" and "an admin"
    // take different ones, and roleLabel is not going to tell us which.
    const otherLabel = sessionPortal === 'member'
      ? 'a member account'
      : `a studio account (${roleLabel(user.role).toLowerCase()})`;
    return (
      <div
        className="relative flex min-h-[100dvh] flex-col items-center justify-center"
        style={{
          background: C.canvas,
          color: C.body,
          fontFamily: "var(--font-sans), 'Inter', system-ui, sans-serif",
          paddingTop: PUBLIC_NAV_CLEARANCE,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <PublicNav action="start-free" dark />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${C.blue}12, transparent 68%)` }} />
          <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: `radial-gradient(circle, ${C.gold}0f, transparent 68%)` }} />
        </div>
        <div className="relative z-10 w-full max-w-[400px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <Wordmark size={40} />
            <h1 className="mt-4 text-[27px] font-[840] tracking-[-0.025em]" style={{ color: C.ink }}>{copy.title}</h1>
          </div>
          <div
            className="rounded-3xl border p-7 text-center sm:p-8"
            style={{ background: 'rgba(16,27,48,0.72)', borderColor: C.line, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: SHADOW.panel }}
          >
            <span
              className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full text-[16px] font-[800] text-white"
              style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueLo})` }}
            >
              {(user.name || '?').slice(0, 1).toUpperCase()}
            </span>
            <p className="text-[15px] font-[750]" style={{ color: C.ink }}>
              This device is signed in as {user.name}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              That is {otherLabel}, so it can&rsquo;t sign in here. Sign it out to
              continue on {copy.title}.
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-[750] text-white"
              style={{ background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`, boxShadow: `0 12px 28px -10px ${C.blueGlow}` }}
            >
              Sign out and continue <ArrowRight size={16} />
            </button>
            <Link
              href={sessionPortal === 'member' ? '/member/dashboard' : '/pt-os'}
              className="mt-3 inline-block text-[13px] font-[650]"
              style={{ color: C.muted }}
            >
              Stay signed in as {user.name}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showDivider = !!GOOGLE_CLIENT_ID || passkeyReady;

  const inputBase = (isErr: boolean) => ({
    background: 'rgba(11,18,32,0.55)',
    color: C.ink,
    border: `1px solid ${isErr ? 'rgba(248,113,113,0.55)' : 'rgba(148,163,184,0.18)'}`,
  });

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{
        background: C.canvas,
        color: C.body,
        fontFamily: "var(--font-sans), 'Inter', system-ui, sans-serif",
      }}
    >
      <PublicNav action="start-free" dark />

      {/* ambient wash — clipped so the glows never create horizontal overflow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${C.blue}12, transparent 68%)` }} />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: `radial-gradient(circle, ${C.gold}0f, transparent 68%)` }} />
      </div>

      <main
        className="relative z-10 flex flex-1 items-center justify-center"
        style={{
          // Guarantee the logo clears the status bar / notch even when
          // env(safe-area-inset-top) resolves to 0 (some in-app browsers /
          // non-cover viewports): floor the notch reserve at 2.75rem.
          paddingTop: PUBLIC_NAV_CLEARANCE,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <m.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid w-full max-w-[1060px] items-center gap-10 lg:grid-cols-[1fr_400px] lg:gap-20"
        >
          {/* ── Brand panel (desktop) ───────────────────────────────────── */}
          <div className="hidden lg:block">
            <Wordmark size={40} />
            <div className="mt-8 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.gold }} />
              <span className="text-[11px] font-[800] uppercase tracking-[0.18em]" style={{ color: C.blueHi }}>
                {copy.panel.eyebrow}
              </span>
            </div>
            <h1 className="mt-3 text-[32px] font-[850] leading-[1.1] tracking-[-0.03em]" style={{ color: C.ink }}>
              {copy.panel.headline}
            </h1>
            <p className="mt-4 max-w-[460px] text-[14px] leading-relaxed" style={{ color: C.muted }}>
              {copy.panel.sub}
            </p>
            <ul className="mt-6 space-y-2.5">
              {copy.panel.points.map((pt) => (
                <li key={pt} className="flex items-center gap-2.5 text-[13.5px] font-[560]" style={{ color: C.body }}>
                  <Check size={14} strokeWidth={3} style={{ color: C.blueHi, flexShrink: 0 }} />
                  {pt}
                </li>
              ))}
            </ul>
            <MiniProduct />
          </div>

          {/* ── Auth card column ────────────────────────────────────────── */}
          <div className="w-full">
            {/* mobile header */}
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <Wordmark size={40} />
              <h1 className="mt-4 text-[24px] font-[840] tracking-[-0.025em]" style={{ color: C.ink }}>{copy.title}</h1>
              <p className="mt-1.5 text-[13.5px]" style={{ color: C.muted }}>
                {copy.blurb}
                {lastOrg ? <> · <span className="font-[650]" style={{ color: C.blueHi }}>{lastOrg}</span></> : ''}
              </p>
            </div>

            <m.div
              key={shakeKey}
              animate={shakeKey > 0 && !reduce ? { x: [0, -9, 8, -6, 4, 0] } : undefined}
              transition={{ duration: 0.42 }}
              className="rounded-3xl border p-7 sm:p-8"
              style={{
                background: 'rgba(16,27,48,0.72)',
                borderColor: C.line,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: SHADOW.panel,
              }}
            >
              {/* remembered-account chip */}
              {rememberedEmail && (
                <button
                  type="button"
                  onClick={() => { setEmail(rememberedEmail); pwRef.current?.focus(); }}
                  className="mt-5 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${C.lineSoft}` }}
                >
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[13px] font-[800] text-white" style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueLo})` }}>
                    {rememberedEmail.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-[600]" style={{ color: C.muted }}>Continue as</span>
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
                    className="flex items-center gap-2.5 overflow-hidden rounded-xl px-3.5 py-3"
                    style={{ background: C.redSoft, border: '1px solid rgba(248,113,113,0.35)' }}
                  >
                    <AlertTriangle size={16} style={{ color: C.red, flexShrink: 0 }} />
                    <span className="text-[13px] font-[550]" style={{ color: '#FCA5A5', lineHeight: 1.4 }}>
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

              {/* form */}
              <form data-no-pull-refresh onSubmit={submit} noValidate className="mt-6">
                {/* email */}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[12px] font-[650] tracking-[0.02em]" style={{ color: C.body }}>Email address</label>
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
                      className="w-full rounded-xl text-[14px] outline-none transition-all placeholder:text-[#475569]"
                      style={{
                        height: 52, paddingLeft: 42, paddingRight: 14,
                        ...inputBase(!!emailError),
                        border: `1px solid ${emailError ? 'rgba(248,113,113,0.55)' : focused === 'email' ? C.blue : 'rgba(148,163,184,0.18)'}`,
                        boxShadow: focused === 'email' && !emailError ? `0 0 0 3px ${C.blue}33` : emailError ? '0 0 0 3px rgba(248,113,113,0.10)' : 'none',
                      }}
                    />
                    <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'email' ? C.blueHi : C.muted, opacity: focused === 'email' ? 1 : 0.55 }} />
                  </div>
                  <AnimatePresence>
                    {emailError && (
                      <m.p id="email-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-[12px] font-[550]" style={{ color: C.red }}>{emailError}</m.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* password */}
                <div className="mt-4">
                  <label htmlFor="password" className="mb-1.5 block text-[12px] font-[650] tracking-[0.02em]" style={{ color: C.body }}>Password</label>
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
                      className="w-full rounded-xl text-[14px] outline-none transition-all placeholder:text-[#475569]"
                      style={{
                        height: 52, paddingLeft: 42, paddingRight: 46,
                        ...inputBase(!!passwordError),
                        border: `1px solid ${passwordError ? 'rgba(248,113,113,0.55)' : focused === 'password' ? C.blue : 'rgba(148,163,184,0.18)'}`,
                        boxShadow: focused === 'password' && !passwordError ? `0 0 0 3px ${C.blue}33` : passwordError ? '0 0 0 3px rgba(248,113,113,0.10)' : 'none',
                      }}
                    />
                    <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focused === 'password' ? C.blueHi : C.muted, opacity: focused === 'password' ? 1 : 0.55 }} />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg transition-colors hover:bg-white/[0.06]"
                      style={{ color: C.muted }}
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
                      <m.p id="pw-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 text-[12px] font-[550]" style={{ color: C.red }}>{passwordError}</m.p>
                    )}
                    {capsOn && !passwordError && (
                      <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1.5 flex items-center gap-1.5 text-[12px] font-[600]" style={{ color: '#FBBF24' }}>
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
                      <label htmlFor="mfa" className="mb-1.5 block text-[13px] font-[600]" style={{ color: C.body }}>
                        Authentication code
                      </label>
                      {/*
                        Accepts a 6-digit TOTP OR a recovery code.

                        This used to strip every non-digit and cap the length at
                        6, so a recovery code could not physically be typed here
                        — the codes handed out at enrolment, and the promise
                        attached to them, were unreachable from the one screen
                        that exists to use them. Letters, spaces and the hyphen
                        now pass through; the server normalises case and
                        separators before comparing.

                        inputMode stays numeric: the 6-digit code is the
                        overwhelmingly common case and a numeric keypad is the
                        right default on a phone. It is a hint, not a filter, so
                        a recovery code can still be typed or pasted.
                      */}
                      <input
                        id="mfa"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={14}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9A-Za-z\s-]/g, '').slice(0, 14))}
                        placeholder="123456"
                        autoFocus
                        className="w-full rounded-xl text-center text-[20px] font-[700] tracking-[0.4em] outline-none transition-all placeholder:text-[#475569]"
                        style={{ height: 52, color: C.ink, background: 'rgba(11,18,32,0.55)', border: `1px solid ${C.blue}`, boxShadow: `0 0 0 3px ${C.blue}33` }}
                      />
                      <p className="mt-1.5 text-[12px]" style={{ color: C.muted }}>
                        Enter the 6-digit code from your authenticator app, or one of your recovery codes.
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
                      style={{ border: `1.5px solid ${remember ? C.blue : 'rgba(148,163,184,0.18)'}`, background: remember ? C.blue : 'rgba(11,18,32,0.55)' }}
                    >
                      {remember && <Check size={12} strokeWidth={3} className="text-white" />}
                    </span>
                  </span>
                  <span className="text-[13px] font-[550]" style={{ color: C.muted }}>Keep me signed in on this device</span>
                </label>

                {/* The reset flow existed on the backend but had no way in from
                    the UI, so a locked-out user had to ask an admin. */}
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-[13px] font-[650]" style={{ color: C.blueHi }}>
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
                    background: ok ? 'linear-gradient(135deg, #059669, #047857)' : `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`,
                    boxShadow: busy || ok ? 'none' : `0 16px 36px ${C.blueGlow}`,
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
                        Log In <ArrowRight size={17} strokeWidth={2.5} />
                      </m.span>
                    )}
                  </AnimatePresence>
                </m.button>

                {/* divider */}
                {showDivider && (
                  <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1" style={{ background: C.lineSoft }} />
                    <span className="text-[11px] font-[600] uppercase tracking-[0.14em]" style={{ color: C.muted }}>or continue with</span>
                    <span className="h-px flex-1" style={{ background: C.lineSoft }} />
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
                    style={{ color: C.blueHi, background: `${C.blue}14`, border: `1px solid ${C.blue}3D`, cursor: passkeyBusy ? 'default' : 'pointer' }}
                  >
                    {passkeyBusy ? <><Loader2 size={17} className="animate-spin" /> Waiting for biometric…</> : <><Fingerprint size={18} /> Sign in with Face ID / Fingerprint</>}
                  </m.button>
                )}
              </form>
            </m.div>

            {/* The other door.
                Two separate sign-ins only work if each one says where the other
                is. Without this, a client who lands on Admin Login has nowhere
                to go but a guessed URL — and "wrong page" on its own is not an
                answer, it is a dead end. */}
            <div className="mt-5 text-center">
              <Link
                href={copy.otherHref}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-[650] transition-colors hover:bg-white/[0.06]"
                style={{ color: C.muted }}
              >
                {copy.otherLabel}
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* trust strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2 text-[11px] font-[600]" style={{ color: C.muted }}>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Lock size={12} style={{ color: C.blueHi }} /> 256-bit encryption</span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><ShieldCheck size={12} style={{ color: C.blueHi }} /> Session protection</span>
              {passkeyReady && <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Fingerprint size={12} style={{ color: C.blueHi }} /> Biometric ready</span>}
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Building2 size={12} style={{ color: C.blueHi }} /> Multi-tenant isolation</span>
            </div>

            <p className="mt-5 text-center text-[11.5px]" style={{ color: C.muted }}>
              © {new Date().getFullYear()} MY PT STUDIO · Need help?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-[650] hover:underline" style={{ color: C.blueHi }}>Contact support</a>
            </p>
          </div>
        </m.div>
      </main>
    </div>
  );
}