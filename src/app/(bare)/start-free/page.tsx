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
import AuthShell, { AuthCard, type AuthAside } from '@/components/landing/AuthShell';
import AuthInput, { RevealButton } from '@/components/landing/AuthField';
import { C, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/landing/tokens';
import { AlertTriangle, ArrowRight, Building2, Clock, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { api } from '@/lib/api';
import PublicPullToRefresh from '@/components/PublicPullToRefresh';
import { errorMessage } from '@/lib/forms/errors';

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
  // Live trial length from the same public endpoint the landing page uses.
  // Null until it loads: the page says "free trial" rather than guess a number.
  const [trialDays, setTrialDays] = useState<number | null>(null);

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
      setServerError(errorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [form, valid, submitting]);

  if (done) return (
    <>
      <PublicPullToRefresh />
      <PendingApproval email={form.email.trim()} trialDays={trialDays} />
    </>
  );

  const aside: AuthAside = {
    eyebrow: trialDays ? `Start free · ${trialDays}-day trial` : 'Start free',
    headline: 'Open your studio. Run it from one place.',
    sub: 'Create the account your clients, programmes, sessions and payments will live in. Every new studio is reviewed by our team, and your trial starts on the day it is approved — not before.',
    notes: [
      'No card needed to apply',
      'A person reviews every new studio',
      `${trialDays ? `${trialDays}-day trial` : 'Free trial'}, counted from approval`,
    ],
  };

  const field = (k: Field) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: touched[k] ? errors[k] : undefined,
  });

  return (
    <>
      <PublicPullToRefresh />
      <AuthShell
        nav={<PublicNav action="sign-in" />}
        mainStyle={{
          // Clears the fixed bar: its own notch reserve plus its content height.
          paddingTop: PUBLIC_NAV_CLEARANCE,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
        aside={aside}
      >
        <AuthCard
          title="Start free"
          subtitle={<>Create your studio account. No card required · <span className="font-[650]" style={{ color: C.blueHi }}>{trialDays ? `${trialDays}-day free trial` : 'Free trial'}</span></>}
          footer={
            <p className="mt-5 text-center text-[13px]" style={{ color: C.muted }}>
              Already have an account?{' '}
              <Link href="/login" className="font-[700] hover:underline" style={{ color: C.blueHi }}>Log in</Link>
            </p>
          }
        >
          <form data-no-pull-refresh onSubmit={submit} noValidate className="mt-6 space-y-4">
            <AuthInput name="full_name" label="Full name" icon={User} autoComplete="name"
              {...field('full_name')} />

            <AuthInput name="business_name" label="Business name" icon={Building2} autoComplete="organization"
              {...field('business_name')}
              hint="The name your clients know you by." />

            <AuthInput name="mobile" label="Mobile number" icon={Phone} type="tel" autoComplete="tel"
              inputMode="numeric"
              {...field('mobile')}
              hint="10 digits, no country code needed." />

            <AuthInput name="email" label="Email address" icon={Mail} type="email" autoComplete="email"
              inputMode="email" autoCapitalize="none" spellCheck={false}
              {...field('email')}
              hint="Where approval and your login go." />

            <AuthInput name="password" label="Create password" icon={Lock}
              type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              {...field('password')}
              hint="At least 8 characters. You'll use this to sign in once approved."
              trailing={<RevealButton shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />} />

            {serverError && (
              <p role="alert" className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[13.5px] font-[560] leading-[1.45]"
                style={{ background: C.redSoft, color: C.red, border: '1px solid rgba(183,28,28,0.22)' }}>
                <AlertTriangle size={16} className="mt-px shrink-0" /> {serverError}
              </p>
            )}

            <button type="submit" disabled={submitting} className={`${PRIMARY_BUTTON} mt-2 h-[54px] w-full text-[15px]`}>
              {submitting
                ? <><Loader2 size={17} className="animate-spin" /> Creating your account…</>
                : <>Create account <ArrowRight size={17} strokeWidth={2.5} /></>}
            </button>
          </form>
        </AuthCard>
      </AuthShell>
    </>
  );
}

/**
 * What actually happens next.
 *
 * Deliberately not a success page that implies they can now log in — approval
 * is a human step, and a "Go to login" button here would send them to a door
 * that refuses them.
 */
function PendingApproval({ email, trialDays }: { email: string; trialDays: number | null }) {
  const steps = [
    'Our team reviews your application.',
    `Your ${trialDays ? `${trialDays}-day ` : ''}free trial starts the moment it’s approved — not now, so you don’t lose a day waiting.`,
    'Sign in with the password you just created.',
  ];
  return (
    <AuthShell
      nav={<PublicNav action="sign-in" />}
      mainStyle={{
        paddingTop: PUBLIC_NAV_CLEARANCE,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      aside={{
        eyebrow: 'Application received',
        headline: 'Your studio is in the queue.',
        sub: 'Nothing is live yet, and nothing has been charged. Once the Command Centre approves your studio, you sign in and your trial begins.',
      }}
    >
      <AuthCard
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: C.goldSoft, color: C.goldHi }}>
              <Clock size={20} />
            </span>
            Pending Approval
          </span>
        }
      >
        <p className="mt-4 text-[14px] leading-relaxed" style={{ color: C.body }}>
          Your account has been created successfully. It is currently awaiting approval from the
          MY&nbsp;PT&nbsp;STUDIO Command Centre. You will receive a notification once your account
          has been activated.
        </p>

        {email && (
          <p className="mt-3 text-[13px]" style={{ color: C.muted }}>
            We&apos;ll email <span className="font-[700]" style={{ color: C.ink }}>{email}</span> when you&apos;re live.
          </p>
        )}

        <div className="mt-6 border-t pt-5" style={{ borderColor: 'rgba(31,42,61,0.10)' }}>
          <p className="font-mono text-[11px] font-[600] uppercase tracking-[0.16em]" style={{ color: C.blueHi }}>
            What happens next
          </p>
          <ol className="mt-3 space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-[13.5px] leading-[1.5]" style={{ color: C.body }}>
                <span className="font-mono text-[11px] font-[600] leading-[1.9]" style={{ color: C.blueHi }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <Link href="/" className={`${SECONDARY_BUTTON} mt-6 h-12 w-full text-[14px]`}>
          Back to home
        </Link>
      </AuthCard>
    </AuthShell>
  );
}
