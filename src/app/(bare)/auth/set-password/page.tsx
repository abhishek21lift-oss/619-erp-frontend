'use client';

// Activation. The first screen a new studio admin ever sees.
//
// It runs with NO session — the token in the URL is the only credential — so
// it deliberately renders outside AppShell and Guard. Wrapping it in either
// would bounce the very person it exists for to /login.
//
// Three states, and getting the middle one right is most of the work: a link
// that is dead (expired, used, cancelled, forged) has to say so in a way that
// tells the reader what to do next, because they cannot fix it themselves and
// the alternative is emailing support to say "the link doesn't work".

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import Link from 'next/link';
import {
  Loader2, Check, X, ShieldCheck, AlertTriangle, ArrowRight, Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { InvitationPreview } from '@/lib/api';
import { invitationPasswordRules } from '@/lib/password-policy';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  newPasswordSchema, blankNewPassword, NEW_PASSWORD_FIELD_HINTS,
} from '@/lib/forms/schemas/auth';
import { errorMessage } from '@/lib/forms/errors';
import { Wordmark } from '@/components/landing/Wordmark';
import { SoftTextField, SoftFormError } from '@/components/landing/SoftField';
import { RevealButton } from '@/components/landing/AuthField';
import { C, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/landing/tokens';

const EASE = [0.16, 1, 0.3, 1] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10"
      style={{ background: C.canvasAlt }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <Wordmark size={26} priority />
        </div>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="rounded-[20px] p-6 sm:p-7"
          style={{ background: CARD.background, border: CARD.border, boxShadow: CARD.boxShadow }}
        >
          {children}
        </m.div>
        <p className="mt-5 text-center text-[12px]" style={{ color: C.muted }}>
          Need help? <a href="mailto:support@myptstudio.com" style={{ color: C.blueHi }}>support@myptstudio.com</a>
        </p>
      </div>
    </div>
  );
}

/* ── Dead link ───────────────────────────────────────────────────────────── */

function DeadLink({ message }: { message: string }) {
  return (
    <Shell>
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px]"
          style={{ background: C.redSoft, color: C.red }}
        >
          <AlertTriangle size={22} />
        </div>
        <h1 className="mb-2 text-[20px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          This link can&rsquo;t be used
        </h1>
        <p className="mb-5 text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>
          {message}
        </p>
        {/* The reader cannot fix this themselves, so both routes forward are
            offered explicitly rather than left implied. */}
        <div className="flex flex-col gap-2">
          <Link href="/login" className={`${SECONDARY_BUTTON} h-11 text-[14px]`}>
            Go to sign in
          </Link>
          <a
            href="mailto:support@myptstudio.com?subject=Invitation%20link%20expired"
            className={`${PRIMARY_BUTTON} h-11 text-[14px]`}
          >
            Request a new invitation
          </a>
        </div>
      </div>
    </Shell>
  );
}

/* ── Success ─────────────────────────────────────────────────────────────── */

function Activated({ email }: { email: string }) {
  const router = useRouter();
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count <= 0) { router.replace('/login'); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, router]);

  return (
    <Shell>
      <div className="text-center">
        <m.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: C.emeraldSoft, color: C.emerald }}
        >
          <ShieldCheck size={26} />
        </m.div>
        <h1 className="mb-2 text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          Your studio is active
        </h1>
        <p className="mb-6 text-[13.5px] leading-[1.55]" style={{ color: C.muted }}>
          Your password is set. Sign in with <strong style={{ color: C.ink }}>{email}</strong> to get started.
        </p>
        <button
          onClick={() => router.replace('/login')}
          className={`${PRIMARY_BUTTON} h-12 w-full text-[15px]`}
        >
          Sign in now <ArrowRight size={15} />
        </button>
        <p className="mt-3 text-[12px]" style={{ color: C.faint }}>
          Taking you there in {count}s
        </p>
      </div>
    </Shell>
  );
}

/* ── The form ────────────────────────────────────────────────────────────── */

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [dead, setDead] = useState<string | null>(null);

  const [show, setShow] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // `strict: true` — this posts to /api/invitations/accept, and
  // routes/invitations.js enforces all five rules. The reset screen next door
  // uses the three-rule policy because auth.js checks length only. Choosing by
  // endpoint is the only thing that keeps either rule honest; see
  // password-policy.ts on why a UI-only rule is worse than none.
  const f = useAppForm({
    schema: newPasswordSchema(true),
    defaultValues: blankNewPassword(),
    fieldHints: NEW_PASSWORD_FIELD_HINTS,
    onSubmit: async (values) => {
      try {
        const r = await api.invitations.accept(token, values.password);
        setDone(r.data.email);
      } catch (err) {
        // A 410 means the link died between loading this page and submitting —
        // someone else used it, or it expired while the form sat open. That is
        // a different situation from a bad password and needs the dead-link
        // screen, not an inline error the user will try to fix by retyping.
        //
        // Rethrown either way, so the form's own state machine still records
        // the attempt as failed. The dead-link screen replaces the form, so
        // its banner is never seen in the 410 case.
        if ((err as { status?: number })?.status === 410) {
          setDead(errorMessage(err, 'This invitation link is no longer valid.'));
        }
        throw err;
      }
    },
  });

  const { form } = f;

  useEffect(() => {
    if (!token) { setDead('The link is missing its invitation code. Use the button in your invitation email.'); setLoading(false); return; }
    api.invitations.preview(token)
      .then((r) => setPreview(r.data))
      .catch((e: unknown) => setDead(errorMessage(e, 'This invitation link is not valid.')))
      .finally(() => setLoading(false));
  }, [token]);


  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
          <p className="text-[13px]" style={{ color: C.muted }}>Checking your invitation…</p>
        </div>
      </Shell>
    );
  }
  if (dead) return <DeadLink message={dead} />;
  if (done) return <Activated email={done} />;
  if (!preview) return null;

  return (
    <Shell>
      <div className="mb-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: C.blueWash, color: C.blueHi }}
          >
            <Building2 size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-[600]" style={{ color: C.ink }}>
              {preview.studio_name}
            </p>
            {/* Masked, because this page is public — it must not become a way
                to read back an address from a token. Enough to recognise. */}
            <p className="truncate text-[12px]" style={{ color: C.muted }}>
              {preview.email_masked}
            </p>
          </div>
        </div>
        <h1 className="text-[22px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>
          Set your password
        </h1>
        <p className="mt-1 text-[13.5px] leading-[1.5]" style={{ color: C.muted }}>
          {preview.owner_name ? `Hello ${preview.owner_name}. ` : ''}
          Choose a password to activate your studio and sign in.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); void f.submit(); }}
        className="flex flex-col gap-4"
      >
        <form.Field name="password">
          {(field) => (
            <SoftTextField
              field={field}
              label="New password"
              required
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              serverError={f.errors.fieldErrors.password}
              trailing={<RevealButton shown={show} onToggle={() => setShow((v) => !v)} />}
            />
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
              serverError={f.errors.fieldErrors.confirm}
            />
          )}
        </form.Field>

        {/* A live checklist rather than a strength bar alone. "Strength: fair"
            does not tell anyone what to type next; a rule that flips to a tick
            does. Every item here is enforced by the server too. */}
        <form.Subscribe selector={(st) => [st.values.password, st.values.confirm] as const}>
          {([password, confirm]) => (
            <ul className="flex flex-col gap-1.5 rounded-[10px] p-3" style={{ background: C.canvasAlt }}>
              {invitationPasswordRules(password).map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-[12px]"
                  style={{ color: r.ok ? C.emerald : C.muted }}>
                  {r.ok ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
                  {r.label}
                </li>
              ))}
              {confirm.length > 0 && (
                <li className="flex items-center gap-2 text-[12px]"
                  style={{ color: password === confirm ? C.emerald : C.muted }}>
                  {password === confirm ? <Check size={13} /> : <X size={13} style={{ opacity: 0.45 }} />}
                  Both passwords match
                </li>
              )}
            </ul>
          )}
        </form.Subscribe>

        <SoftFormError message={f.errors.formError ?? null} />

        {/* The button stays gated on the rules here, unlike elsewhere in this
            migration. A dead button is normally the wrong answer because it
            cannot say WHY — but this form's checklist above says exactly why,
            item by item, and updates as you type. The real double-submit guard
            is useAppForm's in-flight ref either way; `disabled` on its own is
            applied after the current event and two taps in one frame both pass
            it. */}
        <form.Subscribe selector={(st) => [st.values.password, st.values.confirm] as const}>
          {([password, confirm]) => {
            const allOk =
              invitationPasswordRules(password).every((r) => r.ok) &&
              password === confirm && confirm.length > 0;
            return (
              <button
                type="submit"
                disabled={!allOk || f.isSubmitting}
                className={`${PRIMARY_BUTTON} h-12 w-full text-[15px]`}
              >
                {f.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {f.isSubmitting ? 'Activating…' : 'Activate my studio'}
              </button>
            );
          }}
        </form.Subscribe>

        <p className="text-center text-[12px]" style={{ color: C.faint }}>
          This link can be used once and expires{' '}
          {new Date(preview.expires_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
          })}
          .
        </p>
      </form>
    </Shell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <Shell>
        <div className="flex justify-center py-6">
          <Loader2 size={24} className="animate-spin" style={{ color: C.blueHi }} />
        </div>
      </Shell>
    }>
      <SetPasswordForm />
    </Suspense>
  );
}
