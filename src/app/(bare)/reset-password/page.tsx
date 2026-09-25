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
import { Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';
import AuthShell, { AuthCard } from '@/components/landing/AuthShell';
import { RevealButton } from '@/components/landing/AuthField';
import { api } from '@/lib/api';
import { C, PRIMARY_BUTTON } from '@/components/landing/tokens';
import { SoftTextField, SoftFormError } from '@/components/landing/SoftField';
import { passwordStrength, MIN_LENGTH } from '@/lib/password-policy';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  newPasswordSchema, blankNewPassword, NEW_PASSWORD_FIELD_HINTS,
} from '@/lib/forms/schemas/auth';

/** A notice in place of the form — a missing link, or the finished reset. */
function Notice({ tone, title, body, href, cta }: {
  tone: 'error' | 'ok'; title: string; body: string; href: string; cta: string;
}) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
  return (
    <AuthCard title={title}>
      <div
        className="mt-5 flex items-start gap-3 rounded-[16px] border px-4 py-3.5"
        style={tone === 'error'
          ? { background: C.redSoft, borderColor: 'rgba(183,28,28,0.18)' }
          : { background: C.emeraldSoft, borderColor: 'rgba(2,92,67,0.18)' }}
      >
        <Icon size={20} className="mt-px shrink-0" style={{ color: tone === 'error' ? C.red : C.emerald }} />
        <p className="text-[13.5px] leading-relaxed" style={{ color: C.body }}>{body}</p>
      </div>
      <Link href={href} className={`${PRIMARY_BUTTON} mt-5 h-[54px] w-full text-[15px]`}>
        {cta} <ArrowRight size={17} strokeWidth={2.5} />
      </Link>
    </AuthCard>
  );
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['transparent', C.red, C.gold, C.blue, C.emerald];

/**
 * The four-bar strength meter.
 *
 * Extracted so the form body reads as a form. It is `aria-hidden` and paired
 * with a visually-hidden sentence, because four coloured divs announce as
 * nothing at all — a screen-reader user got no feedback from it whatsoever.
 */
function StrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);

  return (
    <div className="mt-2 flex items-center gap-2">
      <div aria-hidden className="flex h-1 flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-full flex-1 rounded-full transition-colors"
            style={{ background: i <= strength ? STRENGTH_COLOR[strength] : C.line }}
          />
        ))}
      </div>
      <span className="text-[11.5px] font-[650]" style={{ color: STRENGTH_COLOR[strength] }}>
        {STRENGTH_LABEL[strength]}
      </span>
      <span className="sr-only" aria-live="polite">
        Password strength: {STRENGTH_LABEL[strength] || 'none'}
      </span>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  // `strict: false` — this posts to /api/auth/reset-password, and auth.js
  // checks length only. The five-rule invitation policy belongs to
  // routes/invitations.js and is applied on the screen that posts there.
  // Choosing by endpoint is the only thing that keeps either rule honest; see
  // password-policy.ts on why a UI-only rule is worse than none.
  const f = useAppForm({
    schema: newPasswordSchema(false),
    defaultValues: blankNewPassword(),
    fieldHints: NEW_PASSWORD_FIELD_HINTS,
    onSubmit: async (values) => {
      await api.auth.resetPassword(token, values.password);
    },
    onSuccess: () => setDone(true),
  });

  const { form } = f;

  // Send them somewhere useful once the password is changed. The backend bumps
  // token_version, so every existing session is already invalid — signing in
  // again is required, not optional.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace('/login'), 3000);
    return () => clearTimeout(t);
  }, [done, router]);


  // No token means someone opened this URL directly rather than via the email.
  // Say so plainly instead of rendering a form that cannot possibly work.
  if (!token) {
    return (
      <Notice
        tone="error"
        title="This link is missing its reset code"
        body="Open the link straight from your email, or request a new one."
        href="/forgot-password"
        cta="Request a new link"
      />
    );
  }

  if (done) {
    return (
      <Notice
        tone="ok"
        title="Password updated"
        body="For safety, every device that was signed in has been signed out. Taking you to sign in…"
        href="/login"
        cta="Sign in now"
      />
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose something you have not used here before.">
      <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="mt-6">
        <form.Field name="password">
          {(field) => (
            <>
              <SoftTextField
                field={field}
                label="New password"
                required
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                focusOnMount
                placeholder={`At least ${MIN_LENGTH} characters`}
                icon={<Lock size={18} />}
                serverError={f.errors.fieldErrors.password}
                trailing={
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    <RevealButton shown={show} onToggle={() => setShow((v) => !v)} />
                  </span>
                }
              />

              {field.state.value && (
                <StrengthMeter password={field.state.value} />
              )}
            </>
          )}
        </form.Field>

        <form.Field name="confirm">
          {(field) => (
            <SoftTextField
              field={field}
              label="Confirm password"
              required
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Type it again"
              icon={<Lock size={18} />}
              className="mt-4"
              serverError={f.errors.fieldErrors.confirm}
            />
          )}
        </form.Field>

        <SoftFormError message={f.errors.formError} className="mt-3" />

        <button type="submit" disabled={f.isSubmitting} className={`${PRIMARY_BUTTON} mt-5 h-[54px] w-full text-[15px]`}>
          {f.isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Updating…</> : 'Set new password'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      nav={<PublicNav action="sign-in" />}
      mainStyle={{
        paddingTop: PUBLIC_NAV_CLEARANCE,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
      }}
      aside={{
        eyebrow: 'Account recovery',
        headline: 'A new password, and a clean slate.',
        sub: 'Setting it signs out every device that was using the old one — including any you have forgotten about — so the only way back in is with what you choose here.',
        notes: [
          `At least ${MIN_LENGTH} characters`,
          'Every other session is signed out',
          'Then sign in with the new password',
        ],
      }}
    >
      {/* useSearchParams needs a Suspense boundary in the App Router. */}
      <Suspense fallback={<div className="h-[340px] rounded-[28px]" style={{ background: 'rgba(255,255,255,0.6)' }} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
