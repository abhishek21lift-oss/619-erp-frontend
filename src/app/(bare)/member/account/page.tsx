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
import Link from 'next/link';
import {
  BadgeCheck, Cake, CalendarDays, Camera, ChevronDown, ChevronLeft, Dumbbell, Eye, EyeOff, KeyRound, LogOut, Mail, Ruler,
  Scale, Target, UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, LoadError, MC, goalLabel, PageSkeleton, PageTitle, Section, SubmitButton, longDate,
} from '@/components/member/MemberUI';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';
import { errorMessage } from '@/lib/forms/errors';
import { rgba } from '@/lib/palette';
import { FormErrorBanner, TextAreaField, TextField } from '@/components/ui/form';
import { api } from '@/lib/api';
import type { MeContact, MeProfile } from '@/lib/api';
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

  const title = <PageTitle accent="workout" icon={<UserRound size={20} />} title="Account" sub={profile?.studio_name ?? null} />;
  if (failed) return <><BackToProfile />{title}<LoadError what="account" /></>;
  if (!profile) return <PageSkeleton />;

  const facts: [LucideIcon, string, string | null][] = [
    [UserRound, 'Name', profile.name],
    [Mail, 'Email', profile.email],
    [BadgeCheck, 'Member ID', profile.member_code],
    [Dumbbell, 'Trainer', profile.trainer_name],
    [Target, 'Goal', goalLabel(profile.goal)],
    [UserRound, 'Gender', profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null],
    [Ruler, 'Height', profile.height ? `${Number(profile.height)} cm` : null],
    [Scale, 'Weight', profile.weight ? `${Number(profile.weight)} kg` : null],
    [Cake, 'Date of birth', longDate(profile.dob)],
    [CalendarDays, 'Member since', longDate(profile.joining_date ?? profile.pt_start_date)],
  ];

  return (
    <>
      <BackToProfile />
      <PageTitle accent="workout" title="Account"
        sub={`${profile.name}${profile.studio_name ? ` · ${profile.studio_name}` : ''}`}
        icon={<ClientAvatar name={profile.name} photoUrl={profile.photo_url}
          className="grid h-full w-full place-items-center overflow-hidden rounded-[13px] text-[15px] font-[820]"
          style={{ color: '#fff' }} />} />

      <PhotoRow profile={profile} onSaved={(photo_url) => setProfile({ ...profile, photo_url })} />

      <Section title="Your details">
        <Card>
          {facts.filter(([, , v]) => v).map(([Icon, k, v], i, arr) => (
            <div key={k} className="flex min-h-[52px] items-center gap-3 px-4 py-3"
              style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
              <Icon size={16} aria-hidden style={{ color: MC.muted }} className="shrink-0" />
              <span className="text-[13px] font-[650]" style={{ color: MC.muted }}>{k}</span>
              <span className="ml-auto min-w-0 truncate text-right text-[14px] font-[700]" style={{ color: MC.ink }}>{v}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 px-1 text-[12px]" style={{ color: MC.muted }}>
          Something here wrong? Ask your trainer to correct it.
        </p>
      </Section>

      <ContactForm profile={profile} onSaved={(c) => setProfile({ ...profile, ...c })} />
      <PasswordForm />

      <button type="button" onClick={() => logout()}
        className="mb-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] text-[14px] font-[750]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: MC.danger }}>
        <LogOut size={16} aria-hidden /> Sign out
      </button>
    </>
  );
}

/**
 * The member's own photo. Only the trainer could set it before, so nearly
 * every member saw their initials on every screen. Cropped square and
 * downscaled on the phone (the trainer's crop tool), then checked by the
 * server — it accepts image bytes only, whatever the file claims to be.
 */
function PhotoRow({ profile, onSaved }: { profile: MeProfile; onSaved: (url: string | null) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(dataUrl: string) {
    setBusy(true);
    try {
      const r = await api.me.setPhoto(dataUrl);
      onSaved(r.data.photo_url);
      toast.success('Photo updated');
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save the photo'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const r = await api.me.removePhoto();
      onSaved(r.data.photo_url);
      toast.success('Photo removed');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not remove the photo'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Photo">
      <Card className="flex items-center gap-3 p-4">
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[18px]">
          <ClientAvatar name={profile.name} photoUrl={profile.photo_url}
            className="grid h-full w-full place-items-center text-[18px] font-[820]" style={{ color: '#fff' }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-[750]" style={{ color: MC.ink }}>{profile.photo_url ? 'Your photo' : 'No photo yet'}</p>
          <p className="text-[12px]" style={{ color: MC.muted }}>Your trainer sees it on your record.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {profile.photo_url && (
            <button type="button" onClick={() => void remove()} disabled={busy}
              className="min-h-[40px] rounded-[12px] px-3 text-[13px] font-[700] disabled:opacity-50"
              style={{ background: 'var(--bg-subtle)', color: MC.danger }}>
              Remove
            </button>
          )}
          <button type="button" onClick={() => setOpen(true)} disabled={busy}
            className="flex min-h-[40px] items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-[750] text-white disabled:opacity-50"
            style={{ background: MC.primary }}>
            <Camera size={15} aria-hidden /> {profile.photo_url ? 'Change' : 'Add'}
          </button>
        </div>
      </Card>
      <PhotoCropModal open={open} onClose={() => setOpen(false)} onConfirm={(d) => void save(d)} title="Your photo" />
    </Section>
  );
}

/** Account sits under the Profile tab: a way back that is not the browser's. */
function BackToProfile() {
  return (
    <Link href="/member/more" className="-ml-1 mb-3 inline-flex min-h-[44px] items-center gap-0.5 pr-3 text-[14px] font-[700]"
      style={{ color: MC.primary }}>
      <ChevronLeft size={18} aria-hidden /> Profile
    </Link>
  );
}

function ContactForm({ profile, onSaved }: {
  profile: MeProfile;
  onSaved: (c: MeContact) => void;
}) {
  const { toast } = useToast();
  const f = useAppForm({
    schema: memberContactSchema,
    defaultValues: blankMemberContact(profile),
    keepValuesOnSuccess: true,
    onSubmit: async (values) => {
      const r = await api.me.updateContact(toMemberContactPayload(values, profile));
      onSaved(r.data);
      // Show what the server stored: a new mobile can carry WhatsApp with it.
      f.resetTo(blankMemberContact(r.data));
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
                description="Your trainer calls you on this number."
                serverError={f.errors.fieldErrors.mobile} />
            )}
          </form.Field>
          <form.Field name="whatsapp">
            {(field) => (
              <TextField field={field} label="WhatsApp number" type="tel" autoComplete="tel-national"
                placeholder="Same as mobile"
                description="Reminders and messages from your studio go here. Change your mobile and this moves with it, unless it is a different number."
                serverError={f.errors.fieldErrors.whatsapp} />
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
  const [open, setOpen] = useState(false);
  const f = useAppForm({
    schema: memberPasswordSchema,
    defaultValues: blankMemberPassword(),
    fieldHints: MEMBER_PASSWORD_FIELD_HINTS,
    onSubmit: async (values) => {
      await api.auth.changePassword(values.current ?? '', values.password);
    },
    onSuccess: () => { toast.success('Password changed'); close(); },
  });
  const { form, isSubmitting } = f;
  const type = reveal ? 'text' : 'password';

  // Folding the form away forgets it: the typed passwords are cleared and
  // "show" is switched back off, so reopening never redisplays a secret —
  // least of all in plain text. Hoisted so onSuccess above can call it.
  function close() {
    f.resetTo(blankMemberPassword());
    setReveal(false);
    setOpen(false);
  }
  const toggle = (
    <button type="button" onClick={() => setReveal((v) => !v)}
      aria-label={reveal ? 'Hide passwords' : 'Show passwords'} aria-pressed={reveal}
      className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: MC.muted }}>
      {reveal ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
    </button>
  );

  // Changing a password is rare: the form stays folded behind one row until
  // asked for, so the page reads as an account and not as a wall of inputs.
  return (
    <Section title="Password" aside={<KeyRound size={13} aria-hidden style={{ color: MC.muted }} />}>
      <Card>
        <button type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-controls="member-password-form"
          className="flex min-h-[56px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-subtle)]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]" style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
            <KeyRound size={16} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Change password</span>
            <span className="block text-[12px]" style={{ color: MC.muted }}>You will need your current one</span>
          </span>
          <ChevronDown size={16} aria-hidden style={{ color: MC.muted, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
        </button>
        {open && (
          <form id="member-password-form" onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate
            className="space-y-4 px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="h-2" aria-hidden />
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
        )}
      </Card>
    </Section>
  );
}
