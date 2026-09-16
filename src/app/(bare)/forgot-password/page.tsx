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
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import BrandLogoWide from '@/components/BrandLogoWide';
import { api } from '@/lib/api';
import { C, SHADOW } from '@/components/landing/tokens';
import { SoftTextField, SoftFormError } from '@/components/landing/SoftField';
import { useAppForm } from '@/lib/forms/useAppForm';
import { forgotPasswordSchema, blankForgotPassword } from '@/lib/forms/schemas/auth';

// The public surface's own tokens rather than five local hex constants. This
// page was already light, but it was FLAT light — a white card with a drop
// shadow on a near-white page — while the rest of the signed-out journey is
// now soft-UI. Recovering a password is the most stressful screen in the
// product to land on; arriving somewhere that looks like a different product
// is not what that moment needs.
const INK = C.ink;
const MUTE = C.muted;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  // The fourth inline copy of an email regex in this tree is gone: the rule is
  // `emailField`'s, which is the same one every other email box in the app now
  // uses. The submit guard is useAppForm's in-flight ref rather than a
  // `disabled` attribute that two Enter presses in one frame both slip past.
  const f = useAppForm({
    schema: forgotPasswordSchema,
    defaultValues: blankForgotPassword(),
    onSubmit: async (values) => {
      await api.auth.forgotPassword(values.email as string);
    },
    onSuccess: () => setSent(true),
  });

  const { form } = f;

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
          <h1 className="mt-4 text-[27px] font-[840] tracking-[-0.025em]" style={{ color: INK }}>
            {sent ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="mt-1.5 max-w-[330px] text-[14px]" style={{ color: MUTE }}>
            {sent
              ? 'If that address belongs to an account, a reset link is on its way. It expires in 15 minutes.'
              : 'Enter the email you sign in with and we will send you a link to set a new password.'}
          </p>
        </div>

        <div className="rounded-[20px] p-6" style={{ background: C.panel, boxShadow: SHADOW.panel }}>
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full" style={{ background: C.emeraldSoft }}>
                <CheckCircle2 size={24} style={{ color: C.emerald }} />
              </div>
              <p className="text-[13.5px] leading-relaxed" style={{ color: MUTE }}>
                Nothing in your inbox after a few minutes? Check spam, then try again — and make sure
                you used the address your studio registered.
              </p>
              <button
                onClick={() => { setSent(false); f.resetTo(blankForgotPassword()); }}
                className="mt-4 text-[13px] font-[650]"
                style={{ color: C.blueHi }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate>
              <form.Field name="email">
                {(field) => (
                  <SoftTextField
                    field={field}
                    label="Email"
                    required
                    type="email"
                    autoComplete="email"
                    focusOnMount
                    placeholder="you@studio.com"
                    icon={<Mail size={16} />}
                    serverError={f.errors.fieldErrors.email}
                  />
                )}
              </form.Field>

              {/* Only a transport or rate-limit failure can land here — the
                  endpoint answers 200 whether or not the address exists, which
                  is what keeps it from being an enumeration oracle. */}
              <SoftFormError message={f.errors.formError} className="mt-3" />

              <button
                type="submit"
                disabled={f.isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-[700] text-white transition-opacity disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, boxShadow: SHADOW.blueGlow }}
              >
                {f.isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Sending…</> : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[13px]" style={{ color: MUTE }}>
          Remembered it? <Link href="/login" className="font-[650]" style={{ color: C.blueHi }}>Sign in</Link>
        </p>
      </m.div>
    </main>
  );
}
