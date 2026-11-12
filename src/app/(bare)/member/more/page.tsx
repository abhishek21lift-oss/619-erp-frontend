'use client';
/**
 * Member — Profile (the "More" tab).
 *
 * Who the member is to the studio, at a glance, and everything they visit
 * less than daily:
 *
 *   • a hero card — photo or initials inside a ring that is their plan's time
 *     left, name, studio, status, and three numbers counted from the log
 *     (sessions, week streak, personal bests)
 *   • everything else, grouped the way a member thinks about it: training,
 *     membership, studio, account — and signing out, set apart
 *
 * Every figure is the server's (/api/me/profile, /membership, /achievements). A
 * number that did not load shows a dash, never a zero — zero sessions is a
 * claim about the member, not about the network.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import {
  Bell, CalendarRange, Camera, ChevronRight, ClipboardCheck, Clock, CreditCard, FileSignature, Flame, IdCard, LineChart, LogOut, MapPin, Medal,
  MessageCircle, Phone, RefreshCw, Receipt, Star, Target, Trophy, UserRound, Dumbbell, Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { EASE, LoadError, MC, longDate } from '@/components/member/MemberUI';
import { loadMemberNotifications } from '@/components/member/memberNotifications';
import InstallAppCard from '@/components/member/InstallAppCard';
import CoachCard from '@/components/member/CoachCard';
import PayBalanceButton from '@/components/member/PayBalanceButton';
import { daysLeft, elapsedPct } from '@/components/member/planDates';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';
import StudioMark from '@/components/StudioMark';
import { api } from '@/lib/api';
import type { MeAchievements, MeCoach, MeMembership, MeProfile, MeSessionBalance } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { errorMessage } from '@/lib/forms/errors';
import { palette, rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';
import { accentGradient, heroMesh } from '@/components/member/memberTheme';
import type { Accent } from '@/components/member/memberTheme';

export default function MemberMorePage() {
  return (
    <Guard role="member">
      <MemberShell>
        <ProfileBody />
      </MemberShell>
    </Guard>
  );
}

type Badge = 'notifications' | 'messages';
type Row = { href: string; label: string; sub: string; icon: LucideIcon; badge?: Badge };
type Group = { title: string; accent: Accent; rows: Row[] };

const GROUPS: Group[] = [
  {
    title: 'Your training',
    accent: 'workout',
    rows: [
      { href: '/member/goals', label: 'Goals', sub: 'Targets with a projected finish date', icon: Target },
      { href: '/member/records', label: 'Records', sub: 'Streaks, milestones and personal bests', icon: Medal },
      { href: '/member/progress', label: 'Progress', sub: 'Weight, measurements and assessment countdown', icon: LineChart },
      { href: '/member/fitness', label: 'Fitness testing', sub: 'Your seven scores, body map and test history', icon: ClipboardCheck },
      { href: '/member/habits', label: 'Daily journal', sub: 'Sleep, steps, water and recovery', icon: ClipboardCheck },
      { href: '/member/photos', label: 'Progress photos', sub: 'Your photo timeline and before/after', icon: Camera },
      { href: '/member/form-check', label: 'Form check', sub: 'Send a lift for your trainer to review', icon: Video },
      { href: '/member/feedback', label: 'Session feedback', sub: 'Rate a session and see what you said', icon: Star },
      { href: '/member/recap', label: 'Monthly recap', sub: 'Your month in numbers — and a card to share', icon: CalendarRange },
    ],
  },
  {
    title: 'Membership',
    accent: 'plan',
    rows: [
      { href: '/member/renew', label: 'Renew', sub: 'Your plan dates and renewal', icon: RefreshCw },
      { href: '/member/payments', label: 'Payments', sub: 'Receipts and payment history', icon: Receipt },
      { href: '/member/card', label: 'Membership card', sub: 'Check-in code and days left', icon: IdCard },
    ],
  },
  {
    title: 'Your studio',
    accent: 'studio',
    rows: [
      { href: '/member/messages', label: 'Messages', sub: 'Talk to your trainer', icon: MessageCircle, badge: 'messages' },
      { href: '/member/notifications', label: 'Notifications', sub: 'Updates from your studio', icon: Bell, badge: 'notifications' },
      { href: '/member/forms', label: 'My forms', sub: 'Health screening and signed consent', icon: FileSignature },
    ],
  },
  {
    title: 'Account',
    accent: 'neutral',
    rows: [
      { href: '/member/account', label: 'Account', sub: 'Contact details and password', icon: UserRound },
    ],
  },
];

function ProfileBody() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [stats, setStats] = useState<MeAchievements | null>(null);
  const [plan, setPlan] = useState<MeMembership | null>(null);
  const [sessions, setSessions] = useState<MeSessionBalance[]>([]);
  const [coach, setCoach] = useState<MeCoach | null>(null);
  const [unread, setUnread] = useState<Record<Badge, number>>({ notifications: 0, messages: 0 });
  const [profileFailed, setProfileFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setProfileFailed(false);
    api.me.profile()
      .then((r) => { if (live) setProfile(r.data); })
      .catch(() => { if (live) setProfileFailed(true); });
    api.me.membership().then((r) => { if (live) setPlan(r.data); }).catch(() => { /* the profile's copy is the fallback */ });
    api.me.sessionBalance()
      .then((r) => { if (live) setSessions(r.data); })
      .catch(() => { /* sessions are additive: the plan card stands without them */ });
    api.me.achievements().then((r) => { if (live) setStats(r.data); }).catch(() => { /* numbers show a dash */ });
    api.me.coach().then((r) => { if (live) setCoach(r.data); }).catch(() => { /* the card is left out */ });
    loadMemberNotifications(true)
      .then((n) => { if (live) setUnread((u) => ({ ...u, notifications: n.length })); })
      .catch(() => { /* a badge is not worth an error */ });
    api.me.messagesUnread()
      .then((r) => { if (live) setUnread((u) => ({ ...u, messages: r.data.unread })); })
      .catch(() => { /* a badge is not worth an error */ });
    return () => { live = false; };
  }, [reloadKey]);

  async function savePhoto(dataUrl: string) {
    setPhotoBusy(true);
    try {
      const r = await api.me.setPhoto(dataUrl);
      setProfile((p) => (p ? { ...p, photo_url: r.data.photo_url } : p));
      toast.success('Photo updated');
      setPhotoOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save the photo'));
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <>
      <h1 className="sr-only">Profile</h1>
      {profileFailed && !profile ? (
        <div className="mb-4">
          <LoadError what="profile" onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      ) : (
        <ProfileHero profile={profile} plan={plan} stats={stats}
          onEditPhoto={() => setPhotoOpen(true)} photoBusy={photoBusy} />
      )}
      {profile && (plan || profile.package_type || profile.pt_end_date) && (
        <MembershipCard plan={plan} profile={profile} sessions={sessions} />
      )}
      {coach && <CoachCard coach={coach} delay={0.08} />}
      {profile && <StudioCard profile={profile} delay={0.1} />}

      {GROUPS.map((g, i) => (
        <m.section key={g.title}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.12 + i * 0.04 }}
          className="mb-5" aria-labelledby={`group-${i}`}>
          <h2 id={`group-${i}`} className="mb-2 px-1 text-[11px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
            {g.title}
          </h2>
          <ul className="overflow-hidden rounded-[18px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {g.rows.map((row, j) => (
              <MenuRow key={row.href} row={row} accent={g.accent} last={j === g.rows.length - 1}
                count={row.badge ? unread[row.badge] : 0} />
            ))}
          </ul>
        </m.section>
      ))}

      {/* Always findable here, even after "Not now" on Home. */}
      <InstallAppCard persistent />

      <button type="button" onClick={() => logout()}
        className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] text-[14px] font-[750] transition-colors active:scale-[0.99]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: MC.danger }}>
        <LogOut size={16} aria-hidden /> Sign out
      </button>
      <p className="mt-4 text-center text-[11px] font-[600]" style={{ color: MC.muted }}>
        {profile?.studio_name ? `${profile.studio_name} · ` : ''}Member app
      </p>
      <PhotoCropModal open={photoOpen} onClose={() => setPhotoOpen(false)}
        onConfirm={(d) => void savePhoto(d)} title="Your photo" />
    </>
  );
}

// ── Who you are ──────────────────────────────────────────────────────────────

/** "Mar 2026", or null. */
function monthYear(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function ProfileHero({ profile, plan, stats, onEditPhoto, photoBusy }: {
  profile: MeProfile | null; plan: MeMembership | null; stats: MeAchievements | null;
  onEditPhoto: () => void; photoBusy: boolean;
}) {
  // The package record is the source of truth, as on Home and the card; the
  // client row's copy is the fallback, and can lag a renewal.
  const endDate = plan?.pt_end_date ?? profile?.pt_end_date;
  const startDate = plan?.pt_start_date ?? profile?.pt_start_date;
  const left = daysLeft(endDate);
  const elapsed = elapsedPct(startDate, endDate);
  // The ring is the plan's time LEFT: full at the start, empty at the end.
  const remaining = elapsed == null ? null : 1 - elapsed / 100;
  const ended = left === 0;
  const since = monthYear(profile?.joining_date ?? profile?.pt_start_date);

  const status = !profile ? null
    : ended ? { label: 'Plan ended', tone: palette.amber[400] }
      : left != null ? { label: `${left} day${left === 1 ? '' : 's'} left`, tone: palette.emerald[400] }
        : { label: 'Member', tone: palette.blue[300] };

  const R = 44;
  const C = 2 * Math.PI * R;

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      aria-label="Your profile"
      className="relative mb-4 overflow-hidden rounded-[24px] p-5 text-white"
      style={{ background: heroMesh.base, boxShadow: `0 22px 48px -22px ${rgba(heroMesh.shadow, 0.75)}` }}
    >
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(heroMesh.glowA, 0.5)}, transparent 68%)` }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(heroMesh.glowB, 0.45)}, transparent 68%)` }} />

      <div className="relative flex items-center gap-4">
        <div className="relative grid h-[100px] w-[100px] shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="5" />
            {remaining != null && (
              <m.circle cx="50" cy="50" r={R} fill="none" stroke={ended ? palette.amber[400] : '#fff'}
                strokeWidth="5" strokeLinecap="round" strokeDasharray={C}
                initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - remaining) }}
                transition={{ duration: 1, ease: EASE, delay: 0.15 }} />
            )}
          </svg>
          {profile ? (
            <>
              <ClientAvatar name={profile.name} photoUrl={profile.photo_url}
                className="grid h-[80px] w-[80px] place-items-center rounded-full text-[24px] font-[820]"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }} />
              {/* A transparent target over the whole avatar: tapping the face
                  opens the same crop tool the Account page uses. */}
              <button type="button" onClick={onEditPhoto} disabled={photoBusy}
                aria-label={profile.photo_url ? 'Change profile photo' : 'Add profile photo'}
                aria-busy={photoBusy || undefined}
                className="absolute inset-0 z-10 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait" />
              <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 z-20 grid h-8 w-8 place-items-center rounded-full text-white"
                style={{ background: MC.primary, border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 12px rgba(15,23,42,0.25)' }}>
                <Camera size={14} />
              </span>
            </>
          ) : (
            <span className="h-[80px] w-[80px] animate-pulse rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {profile ? (
            <>
              <p className="truncate text-[22px] font-[820] leading-tight tracking-[-0.02em]">{profile.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span aria-hidden className="inline-flex shrink-0">
                  <StudioMark name={profile.studio_name || 'Your studio'} logoUrl={profile.studio_logo}
                    size={18} radius={9} background="#FFFFFF" />
                </span>
                <p className="min-w-0 truncate text-[13px] font-[600] opacity-75">
                  {profile.studio_name || 'Your studio'}
                  {profile.member_code ? ` · #${profile.member_code}` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="block h-5 w-3/4 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.14)' }} />
              <span className="mt-2 block h-3.5 w-1/2 animate-pulse rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </>
          )}
          {status && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[750]"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: status.tone }} />
              {status.label}
              {since && <span className="opacity-60">· since {since}</span>}
            </span>
          )}
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-3 overflow-hidden rounded-[16px]"
        style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <HeroStat icon={Dumbbell} label="Sessions" value={stats?.totals.sessions} />
        <HeroStat icon={Flame} label="Week streak" value={stats?.training.current} divider />
        <HeroStat icon={Trophy} label="Personal bests" value={stats?.totals.prs} divider />
      </dl>
    </m.section>
  );
}

function HeroStat({ icon: Icon, label, value, divider = false }: {
  icon: LucideIcon; label: string; value: number | undefined; divider?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse px-3 py-3 text-center" style={divider ? { borderLeft: '1px solid rgba(255,255,255,0.2)' } : undefined}>
      <dt className="mt-1.5 text-[11px] font-[650] opacity-85">{label}</dt>
      <dd className="flex items-center justify-center gap-1.5 text-[22px] font-[820] leading-none tabular-nums tracking-[-0.02em]">
        <Icon size={15} aria-hidden className="opacity-80" />
        {value == null ? '—' : value.toLocaleString('en-IN')}
      </dd>
    </div>
  );
}

// ── The plan, in one card ───────────────────────────────────────────────────

/** A numeric figure from the API. Callers keep the "did it load?" null. */
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const inr = (v: unknown) => '₹' + num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/**
 * What the studio published: a phone number, an address, opening hours.
 * Whole rows only — a published studio should read as a card, not as three
 * labels with two blanks. Omitted entirely when the studio published nothing.
 */
function StudioCard({ profile, delay }: { profile: MeProfile; delay: number }) {
  const rows: [LucideIcon, string][] = [
    [Phone, profile.studio_phone ?? ''],
    [MapPin, profile.studio_address ?? ''],
    [Clock, profile.studio_hours ?? ''],
  ].filter(([, v]) => v) as [LucideIcon, string][];
  if (rows.length === 0) return null;

  return (
    <m.section aria-label="Studio contact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }} className="mb-4">
      <div className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="mb-2 text-[11px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
          {profile.studio_name ?? 'Your studio'}
        </p>
        <ul className="space-y-2">
          {rows.map(([Icon, value], i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: MC.ink }}>
              <Icon size={15} className="mt-0.5 shrink-0" style={{ color: MC.muted }} aria-hidden />
              {Icon === Phone ? <a href={`tel:${value}`} style={{ color: MC.primary }}>{value}</a> : <span>{value}</span>}
            </li>
          ))}
        </ul>
      </div>
    </m.section>
  );
}

/**
 * Plan, end date and what is still owed — the one thing the hero's ring does
 * not say. The balance is only shown when the membership record loaded: a
 * failed read is a dash, not "Paid up".
 */
function MembershipCard({ plan, profile, sessions }: {
  plan: MeMembership | null; profile: MeProfile; sessions: MeSessionBalance[];
}) {
  const endDate = plan?.pt_end_date ?? profile.pt_end_date;
  const endsOn = longDate(endDate);
  const left = daysLeft(endDate);
  const balance = plan && plan.balance_amount != null ? num(plan.balance_amount) : null;
  const packageName = plan?.package_type || profile.package_type || 'Personal Training';

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
      aria-label="Your membership"
      className="relative mb-4 overflow-hidden rounded-[20px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(heroMesh.glowA, 0.16)}, transparent 70%)` }} />

      <div className="relative flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-white" style={{ background: accentGradient('plan') }}>
          <IdCard size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-[780] uppercase tracking-[0.13em]" style={{ color: MC.muted }}>Membership</p>
          <p className="mt-0.5 truncate text-[15px] font-[800]" style={{ color: MC.ink }}>{packageName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-[780] uppercase tracking-[0.13em]" style={{ color: MC.muted }}>Balance</p>
          <p className="mt-0.5 text-[17px] font-[850] tabular-nums"
            style={{ color: balance == null ? MC.muted : balance > 0 ? 'var(--warning-text)' : 'var(--success-text)' }}>
            {balance == null ? '—' : balance > 0 ? inr(balance) : 'Paid up'}
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-[650]" style={{ color: MC.muted }}>
          <CalendarRange size={13} aria-hidden className="shrink-0" />
          <span className="truncate">
            {endsOn ? `${left === 0 ? 'Ended' : 'Ends'} ${endsOn}` : 'No end date set — ask your trainer'}
          </span>
        </p>
        {balance != null && balance > 0 && (
          <PayBalanceButton
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[800] text-white"
            style={{ background: accentGradient('plan') }}>
            <CreditCard size={14} aria-hidden /> Pay {inr(balance)}
          </PayBalanceButton>
        )}
      </div>

      {sessions.length > 0 && (
        <div role="group" className="mt-3 space-y-1" aria-label="Session balance">
          {sessions.map((s, i) => (
            <p key={i} className="text-[12.5px]" style={{ color: MC.muted }}>
              <span className="font-[750]" style={{ color: MC.ink }}>
                {s.remaining_sessions} of {s.total_sessions} sessions left
              </span>
              {s.end_date && <> · ends {longDate(s.end_date)}</>}
            </p>
          ))}
        </div>
      )}
    </m.section>
  );
}

// ── One menu row ─────────────────────────────────────────────────────────────

function MenuRow({ row, accent, last, count }: { row: Row; accent: Accent; last: boolean; count: number }) {
  const { href, label, sub, icon: Icon } = row;
  return (
    <li style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <Link href={href}
        aria-label={count > 0 ? `${label}, ${count} unread` : undefined}
        className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-subtle)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white" style={{ background: accentGradient(accent) }}>
          <Icon size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>{label}</span>
          <span className="block truncate text-[12px]" style={{ color: MC.muted }}>{sub}</span>
        </span>
        {count > 0 && (
          <span aria-hidden className="rounded-full px-2 py-0.5 text-[11px] font-[800] text-white tabular-nums" style={{ background: MC.danger }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
        <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
      </Link>
    </li>
  );
}
