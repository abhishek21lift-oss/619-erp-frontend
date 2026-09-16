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
import { C, SHADOW } from '@/components/landing/tokens';
import { SoftTextField, SoftFormError } from '@/components/landing/SoftField';
import { passwordStrength, MIN_LENGTH } from '@/lib/password-policy';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  newPasswordSchema, blankNewPassword, NEW_PASSWORD_FIELD_HINTS,
} from '@/lib/forms/schemas/auth';

// Tokens, not local hex: the twin of /forgot-password, and the last screen in
// the recovery journey. See the note there.
const INK = C.ink;
const MUTE = C.muted;

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
      <div className="rounded-[20px] p-6 text-center" style={{ background: C.panel, boxShadow: SHADOW.panel }}>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: C.redSoft }}>
          <AlertCircle size={24} style={{ color: C.red }} />
        </div>
        <p className="text-[14px] font-[650]" style={{ color: INK }}>This link is missing its reset code</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
          Open the link straight from your email, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] py-3 text-[14px] font-[700] text-white"
          style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, boxShadow: SHADOW.blueGlow }}
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-[20px] p-6 text-center" style={{ background: C.panel, boxShadow: SHADOW.panel }}>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: C.emeraldSoft }}>
          <CheckCircle2 size={24} style={{ color: C.emerald }} />
        </div>
        <p className="text-[14px] font-[650]" style={{ color: INK }}>Password updated</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>
          For safety, every device that was signed in has been signed out. Taking you to sign in…
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] py-3 text-[14px] font-[700] text-white"
          style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, boxShadow: SHADOW.blueGlow }}
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] p-6" style={{ background: C.panel, boxShadow: SHADOW.panel }}>
      <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate>
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
                icon={<Lock size={16} />}
                serverError={f.errors.fieldErrors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: MUTE }}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
              icon={<Lock size={16} />}
              className="mt-4"
              serverError={f.errors.fieldErrors.confirm}
            />
          )}
        </form.Field>

        <SoftFormError message={f.errors.formError} className="mt-3" />

        <button
          type="submit"
          disabled={f.isSubmitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-[700] text-white transition-opacity disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, boxShadow: SHADOW.blueGlow }}
        >
          {f.isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Updating…</> : 'Set new password'}
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
        background: C.canvas,
        color: INK,
        fontFamily: "var(--font-sans), 'Inter', system-ui, sans-serif",
        paddingTop: 'calc(max(env(safe-area-inset-top), 2.75rem) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${C.goldSoft}, transparent 68%)` }} />
        <div className="absolute -bottom-28 -left-20 h-[320px] w-[320px] rounded-full" style={{ background: `radial-gradient(circle, ${C.blueWash}, transparent 68%)` }} />
      </div>

      <Link
        href="/login"
        className="absolute left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-[600] transition-shadow"
        style={{ color: MUTE, background: C.canvas, boxShadow: SHADOW.raised, top: 'calc(max(env(safe-area-inset-top), 2.75rem) + 0.5rem)' }}
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
        <Suspense fallback={<div className="h-[260px] rounded-[20px]" style={{ background: C.panel, boxShadow: SHADOW.panel }} />}>
          <ResetPasswordForm />
        </Suspense>
      </m.div>
    </main>
  );
}
