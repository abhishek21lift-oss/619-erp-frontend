'use client';
/**
 * Member — Account.
 *
 * Who they are to the studio (read-only: the trainer owns the record), the
 * two contact details a member may correct themselves, and their password.
 *
 * A wrong current password is a 400 from the server, not a 401 — a 401 would
 * make the shared http client treat a typo as an expired session and sign the
 * member out mid-form.
 */

import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LogOut, UserRound } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, LoadError, MC, PageSkeleton, PageTitle, Section, SubmitButton, longDate,
} from '@/components/member/MemberUI';
import { FormErrorBanner, TextAreaField, TextField } from '@/components/ui/form';
import { api } from '@/lib/api';
import type { MeProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  MEMBER_PASSWORD_FIELD_HINTS, blankMemberContact, blankMemberPassword,
  memberContactSchema, memberPasswordSchema, toMemberContactPayload,
} from '@/lib/forms/schemas/memberAccount';
import { MIN_LENGTH } from '@/lib/forms/schemas/auth';
import { useToast } from '@/lib/toast';

export default function MemberAccountPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <AccountBody />
      </MemberShell>
    </Guard>
  );
}

function AccountBody() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me.profile().then((r) => setProfile(r.data)).catch(() => setFailed(true));
  }, []);

  const title = <PageTitle icon={<UserRound size={20} />} title="Account" sub={profile?.studio_name ?? null} />;
  if (failed) return <>{title}<LoadError what="account" /></>;
  if (!profile) return <PageSkeleton />;

  const facts: [string, string | null][] = [
    ['Name', profile.name],
    ['Email', profile.email],
    ['Member ID', profile.member_code],
    ['Trainer', profile.trainer_name],
    ['Member since', longDate(profile.joining_date ?? profile.pt_start_date)],
  ];

  return (
    <>
      {title}
      <Section title="Your details">
        <Card>
          {facts.filter(([, v]) => v).map(([k, v], i, arr) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-3"
              style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
              <span className="text-[12.5px] font-[650]" style={{ color: MC.muted }}>{k}</span>
              <span className="min-w-0 truncate text-right text-[13px] font-[700]" style={{ color: MC.ink }}>{v}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 px-1 text-[11.5px]" style={{ color: MC.muted }}>
          Something here wrong? Ask your trainer to correct it.
        </p>
      </Section>

      <ContactForm profile={profile} onSaved={(c) => setProfile({ ...profile, ...c })} />
      <PasswordForm />

      <button type="button" onClick={() => logout()}
        className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[750]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: MC.danger }}>
        <LogOut size={16} aria-hidden /> Sign out
      </button>
    </>
  );
}

function ContactForm({ profile, onSaved }: {
  profile: MeProfile;
  onSaved: (c: { mobile: string | null; address: string | null }) => void;
}) {
  const { toast } = useToast();
  const f = useAppForm({
    schema: memberContactSchema,
    defaultValues: blankMemberContact(profile),
    keepValuesOnSuccess: true,
    onSubmit: async (values) => {
      const r = await api.me.updateContact(toMemberContactPayload(values));
      onSaved(r.data);
    },
    onSuccess: () => toast.success('Contact details saved'),
  });
  const { form, isSubmitting } = f;

  return (
    <Section title="Contact">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="space-y-4">
          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />
          <form.Field name="mobile">
            {(field) => (
              <TextField field={field} label="Mobile" type="tel" autoComplete="tel-national" required
                placeholder="10-digit mobile number"
                description="Your trainer reaches you on this number, including on WhatsApp."
                serverError={f.errors.fieldErrors.mobile} />
            )}
          </form.Field>
          <form.Field name="address">
            {(field) => (
              <TextAreaField field={field} label="Address" maxLength={500} rows={3}
                placeholder="House, street, area, city"
                serverError={f.errors.fieldErrors.address} />
            )}
          </form.Field>
          <SubmitButton busy={isSubmitting} busyLabel="Saving…">Save contact details</SubmitButton>
        </form>
      </Card>
    </Section>
  );
}

function PasswordForm() {
  const { toast } = useToast();
  const [reveal, setReveal] = useState(false);
  const f = useAppForm({
    schema: memberPasswordSchema,
    defaultValues: blankMemberPassword(),
    fieldHints: MEMBER_PASSWORD_FIELD_HINTS,
    onSubmit: async (values) => {
      await api.auth.changePassword(values.current ?? '', values.password);
    },
    onSuccess: () => toast.success('Password changed'),
  });
  const { form, isSubmitting } = f;
  const type = reveal ? 'text' : 'password';
  const toggle = (
    <button type="button" onClick={() => setReveal((v) => !v)}
      aria-label={reveal ? 'Hide passwords' : 'Show passwords'} aria-pressed={reveal}
      className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: MC.muted }}>
      {reveal ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
    </button>
  );

  return (
    <Section title="Password" aside={<KeyRound size={13} aria-hidden style={{ color: MC.muted }} />}>
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="space-y-4">
          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />
          <form.Field name="current">
            {(field) => (
              <TextField field={field} label="Current password" type={type} autoComplete="current-password"
                required trailing={toggle} serverError={f.errors.fieldErrors.current} />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextField field={field} label="New password" type={type} autoComplete="new-password" required
                description={`At least ${MIN_LENGTH} characters.`}
                serverError={f.errors.fieldErrors.password} />
            )}
          </form.Field>
          <form.Field name="confirm">
            {(field) => (
              <TextField field={field} label="Confirm new password" type={type} autoComplete="new-password"
                required serverError={f.errors.fieldErrors.confirm} />
            )}
          </form.Field>
          <SubmitButton busy={isSubmitting} busyLabel="Changing…">Change password</SubmitButton>
        </form>
      </Card>
    </Section>
  );
}
