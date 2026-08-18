'use client';

// The way in for someone who does not have an account yet.
//
// "Start free" used to go to /login, which is a dead end for exactly the person
// that button is aimed at. This is a public page — no Guard, no AppShell —
// because the applicant has nothing to authenticate with.
//
// Nothing is provisioned here. The application goes into a queue and a human at
// the Command Centre approves it, so the honest end state of this page is
// "pending", not "welcome". Saying "your studio is ready" and then bouncing
// them off a login they cannot pass would be worse than saying nothing.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';
import { Wordmark } from '@/components/landing/Wordmark';
import { C, SHADOW } from '@/components/landing/tokens';
import { ArrowRight, Building2, CheckCircle2, Clock, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { api } from '@/lib/api';

type Field = 'full_name' | 'business_name' | 'mobile' | 'email' | 'password';

const BLANK: Record<Field, string> = {
  full_name: '', business_name: '', mobile: '', email: '', password: '',
};

/** Mirrors the server's rules so the applicant hears about a problem before submitting. */
function validate(form: Record<Field, string>): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const digits = form.mobile.replace(/\D/g, '');

  if (form.full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
  if (form.business_name.trim().length < 2) e.business_name = 'Please enter your business name.';
  if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith('91')) || (digits.length === 11 && digits.startsWith('0'))))
    e.mobile = 'Enter a 10-digit mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
  if (form.password.length < 8) e.password = 'Use at least 8 characters.';
  return e;
}


export default function StartFreePage() {
  const [form, setForm] = useState<Record<Field, string>>(BLANK);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Live trial length from the same public endpoint the landing page uses —
  // never a hard-coded figure here, so a config change shows up everywhere.
  const [trialDays, setTrialDays] = useState(3);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
    const url = (p: string) =>
      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ? p
        : `${base}${p}`;
    fetch(url('/api/public/plans'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.data?.trial_days) setTrialDays(j.data.trial_days);
      })
      .catch(() => {});
  }, []);

  const errors = useMemo(() => validate(form), [form]);
  const valid = Object.keys(errors).length === 0;

  const set = useCallback((k: Field, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setServerError('');
  }, []);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Reveal every problem at once rather than one per attempt.
    setTouched({ full_name: true, business_name: true, mobile: true, email: true, password: true });
    if (!valid || submitting) return;

    setSubmitting(true);
    setServerError('');
    try {
      await api.auth.registerStudio({
        full_name: form.full_name.trim(),
        business_name: form.business_name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, valid, submitting]);

  if (done) return <PendingApproval email={form.email.trim()} trialDays={trialDays} />;

  return (
    <div
      className="relative flex min-h-dvh flex-col"
      style={{ background: C.canvas, color: C.body }}
    >
      <PublicNav action="sign-in" dark />

      {/* ambient wash — clipped so the glows never create horizontal overflow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${C.blue}12, transparent 68%)` }} />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: `radial-gradient(circle, ${C.gold}0f, transparent 68%)` }} />
      </div>

      {/* Clears the fixed bar: its own notch reserve plus its content height. */}
      <main
        className="relative z-10 flex flex-1 items-start justify-center px-4 pb-14 sm:px-6"
        style={{ paddingTop: PUBLIC_NAV_CLEARANCE }}
      >
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <Wordmark size={40} />
            <span
              className="mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-[750] uppercase tracking-[0.1em]"
              style={{ background: `${C.blue}14`, color: C.blueHi }}
            >
              {trialDays}-day free trial
            </span>
            <h1 className="mt-3 text-[26px] font-[850] tracking-[-0.03em]" style={{ color: C.ink }}>
              Start free
            </h1>
            <p className="mt-1.5 text-[13.5px]" style={{ color: C.muted }}>
              Create your studio account. No card required.
            </p>
          </div>

          <form
            onSubmit={submit}
            noValidate
            className="rounded-[22px] border p-5 sm:p-6"
            style={{
              background: 'rgba(16,27,48,0.72)',
              borderColor: C.line,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: SHADOW.card,
            }}
          >
            <TextField id="full_name" label="Full name" icon={User} autoComplete="name"
              value={form.full_name} onChange={(v) => set('full_name', v)}
              onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
              error={touched.full_name ? errors.full_name : undefined} />

            <TextField id="business_name" label="Business name" icon={Building2} autoComplete="organization"
              value={form.business_name} onChange={(v) => set('business_name', v)}
              onBlur={() => setTouched((t) => ({ ...t, business_name: true }))}
              error={touched.business_name ? errors.business_name : undefined}
              hint="The name your clients know you by." />

            <TextField id="mobile" label="Mobile number" icon={Phone} type="tel" autoComplete="tel"
              inputMode="numeric"
              value={form.mobile} onChange={(v) => set('mobile', v)}
              onBlur={() => setTouched((t) => ({ ...t, mobile: true }))}
              error={touched.mobile ? errors.mobile : undefined}
              hint="10 digits, no country code needed." />

            <TextField id="email" label="Email address" icon={Mail} type="email" autoComplete="email"
              inputMode="email"
              value={form.email} onChange={(v) => set('email', v)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? errors.email : undefined}
              hint="Where approval and your login go." />

            <TextField id="password" label="Create password" icon={Lock}
              type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              value={form.password} onChange={(v) => set('password', v)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : undefined}
              hint="At least 8 characters. You'll use this to sign in once approved."
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-md p-1" style={{ color: C.muted }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              } />

            {serverError && (
              <p role="alert" className="mb-3 rounded-[10px] px-3 py-2 text-[12.5px] font-[600]"
                style={{ background: C.redSoft, color: '#FCA5A5' }}>
                {serverError}
              </p>
            )}

            <button type="submit" disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-[780] text-white transition active:scale-[0.99] disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`, boxShadow: `0 8px 22px ${C.blueGlow}` }}>
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Creating your account…</>
                : <>Create account <ArrowRight size={16} /></>}
            </button>

            <p className="mt-3 text-center text-[12px]" style={{ color: C.muted }}>
              Already have an account?{' '}
              <Link href="/login" className="font-[700]" style={{ color: C.blueHi }}>Log in</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

/**
 * What actually happens next.
 *
 * Deliberately not a success page that implies they can now log in — approval
 * is a human step, and a "Go to login" button here would send them to a door
 * that refuses them.
 */
function PendingApproval({ email, trialDays }: { email: string; trialDays: number }) {
  return (
    <div
      className="relative flex min-h-dvh flex-col"
      style={{ background: C.canvas, color: C.body }}
    >
      <PublicNav action="sign-in" dark />

      {/* ambient wash — clipped so the glows never create horizontal overflow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${C.blue}12, transparent 68%)` }} />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: `radial-gradient(circle, ${C.gold}0f, transparent 68%)` }} />
      </div>

      <main
        className="relative z-10 flex flex-1 items-start justify-center px-4 pb-14"
        style={{ paddingTop: PUBLIC_NAV_CLEARANCE }}
      >
        <div
          className="w-full max-w-[460px] rounded-[22px] border p-6 text-center sm:p-8"
          style={{
            background: 'rgba(16,27,48,0.72)',
            borderColor: C.line,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: SHADOW.card,
          }}
        >
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px]"
            style={{ background: C.goldSoft, color: C.goldHi }}
          >
            <Clock size={26} />
          </span>

          <h1 className="mt-4 flex items-center justify-center gap-2 text-[20px] font-[830] tracking-[-0.02em]"
            style={{ color: C.ink }}>
            Pending Approval
          </h1>

          <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: C.body }}>
            Your account has been created successfully. It is currently awaiting approval from the
            MY&nbsp;PT&nbsp;STUDIO Command Centre. You will receive a notification once your account
            has been activated.
          </p>

          {email && (
            <p className="mt-3 text-[12.5px]" style={{ color: C.muted }}>
              We&apos;ll email <span className="font-[700]" style={{ color: C.ink }}>{email}</span> when you&apos;re live.
            </p>
          )}

          <div className="mt-5 rounded-[14px] border p-3.5 text-left"
            style={{ background: `${C.blue}0d`, borderColor: `${C.blue}24` }}>
            <p className="flex items-center gap-1.5 text-[11px] font-[800] uppercase tracking-[0.1em]" style={{ color: C.blueHi }}>
              <CheckCircle2 size={13} /> What happens next
            </p>
            <ol className="mt-2 space-y-1.5 text-[12.5px]" style={{ color: C.body }}>
              <li>1. Our team reviews your application.</li>
              <li>2. Your {trialDays}-day free trial starts the moment it&apos;s approved — not now, so you don&apos;t lose a day waiting.</li>
              <li>3. Sign in with the password you just created.</li>
            </ol>
          </div>

          <Link href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] border px-5 text-[13px] font-[750] transition-colors hover:bg-white/[0.06]"
            style={{ borderColor: C.line, color: C.ink }}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function TextField({
  id, label, icon: Icon, value, onChange, onBlur, error, hint, placeholder,
  type = 'text', autoComplete, inputMode, trailing,
}: {
  id: string; label: string; icon: typeof User;
  value: string; onChange: (v: string) => void; onBlur: () => void;
  error?: string; hint?: string; placeholder?: string;
  type?: string; autoComplete?: string;
  inputMode?: 'numeric' | 'email' | 'text'; trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-[700]" style={{ color: C.body }}>
        {label}
      </label>
      <div className="relative flex items-center">
        <Icon size={15} className="pointer-events-none absolute left-3" style={{ color: C.muted }} aria-hidden />
        <input
          id={id} name={id} type={type} value={value} placeholder={placeholder}
          autoComplete={autoComplete} inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          // h-12 rather than padding-derived: globals.css sets html{font-size:14px},
          // so padding alone lands under the 44px a thumb needs.
          className="h-12 w-full rounded-[12px] pl-9 pr-10 text-[13.5px] outline-none transition placeholder:text-[#475569]"
          style={{
            background: 'rgba(11,18,32,0.55)',
            border: `1.5px solid ${error ? 'rgba(248,113,113,0.55)' : 'rgba(148,163,184,0.18)'}`,
            color: C.ink,
          }}
        />
        {trailing && <span className="absolute right-2.5">{trailing}</span>}
      </div>
      {error
        ? <p id={`${id}-error`} role="alert" className="mt-1 text-[11.5px] font-[600]" style={{ color: C.red }}>{error}</p>
        : hint ? <p id={`${id}-hint`} className="mt-1 text-[11.5px]" style={{ color: C.muted }}>{hint}</p> : null}
    </div>
  );
}