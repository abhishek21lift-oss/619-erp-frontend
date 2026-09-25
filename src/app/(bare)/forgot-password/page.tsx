'use client';

// Request a password-reset link.
//
// The backend has POST /api/auth/forgot-password — hashed token, 15-minute
// expiry, enumeration-safe response. Before this page nothing in the UI called
// it, so a locked-out user had no way back in without an administrator.
//
// Same signed-out frame as the sign-in doors (AuthShell): recovering a
// password is the most stressful screen in the product to land on, and
// arriving somewhere that looks like a different product is not what that
// moment needs.

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import PublicNav, { PUBLIC_NAV_CLEARANCE } from '@/components/PublicNav';
import AuthShell, { AuthCard } from '@/components/landing/AuthShell';
import { api } from '@/lib/api';
import { C, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/landing/tokens';
import { SoftTextField, SoftFormError } from '@/components/landing/SoftField';
import { useAppForm } from '@/lib/forms/useAppForm';
import { forgotPasswordSchema, blankForgotPassword } from '@/lib/forms/schemas/auth';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  // The rule is `emailField`'s, the same one every other email box in the app
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
        headline: 'Locked out? Back in two steps.',
        sub: 'We email a single-use link to the address you sign in with. It works once and expires after 15 minutes, and setting a new password signs out every device that was using the old one.',
        notes: [
          'Enter the email you sign in with',
          'Open the link within 15 minutes',
          'Choose a new password and sign in',
        ],
      }}
    >
      <AuthCard
        title={sent ? 'Check your email' : 'Reset password'}
        subtitle={sent
          ? 'If that address belongs to an account, a reset link is on its way. It expires in 15 minutes.'
          : 'Enter the email you sign in with and we will send you a link to set a new password.'}
        footer={
          <p className="mt-5 text-center text-[13px]" style={{ color: C.muted }}>
            Remembered it? <Link href="/login" className="font-[650] hover:underline" style={{ color: C.blueHi }}>Sign in</Link>
          </p>
        }
      >
        {sent ? (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-[16px] border px-4 py-3.5" style={{ borderColor: 'rgba(2,92,67,0.18)', background: C.emeraldSoft }}>
              <CheckCircle2 size={20} className="mt-px shrink-0" style={{ color: C.emerald }} />
              <p className="text-[13.5px] leading-relaxed" style={{ color: C.body }}>
                Nothing in your inbox after a few minutes? Check spam, then try again — and make sure
                you used the address your studio registered.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setSent(false); f.resetTo(blankForgotPassword()); }}
              className={`${SECONDARY_BUTTON} mt-4 h-12 w-full text-[14px]`}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="mt-6">
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
                  icon={<Mail size={18} />}
                  serverError={f.errors.fieldErrors.email}
                />
              )}
            </form.Field>

            {/* Only a transport or rate-limit failure can land here — the
                endpoint answers 200 whether or not the address exists, which
                is what keeps it from being an enumeration oracle. */}
            <SoftFormError message={f.errors.formError} className="mt-3" />

            <button type="submit" disabled={f.isSubmitting} className={`${PRIMARY_BUTTON} mt-5 h-[54px] w-full text-[15px]`}>
              {f.isSubmitting
                ? <><Loader2 size={17} className="animate-spin" /> Sending…</>
                : <>Send reset link <ArrowRight size={17} strokeWidth={2.5} /></>}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  );
}
