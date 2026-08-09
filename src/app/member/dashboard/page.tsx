'use client';
/**
 * Member Dashboard — what a client sees when they sign in.
 *
 * ── What this replaces ────────────────────────────────────────────────────
 *
 * A prototype that had been left in place. It showed "42 workouts", "-2.1kg"
 * and a "7 day streak" to every member, because all three were string
 * literals in the JSX. Its icons were Unicode geometry (◧ ◆ ◈ ◌ ⌂ ◉), which
 * is why they rendered as diamonds and half-squares. Its bottom-nav tabs set
 * state that nothing read, so four of the five did nothing at all.
 *
 * And its plan card was blank — "Days remaining ___ days", "ENDS ON —" —
 * because it loaded `user.member_id`, the foreign key to the legacy and empty
 * `clients` table. Accounts created by the activation flow carry
 * `pt_client_id` instead, so the lookup found nothing and the card rendered
 * its own placeholders.
 *
 * Everything here comes from /api/me, which is scoped server-side to the
 * caller's own client record. No route in that module takes an id, so there
 * is nothing a member could tamper with to reach somebody else's data.
 *
 * ── The design ────────────────────────────────────────────────────────────
 *
 * One saturated surface: the plan. "How long have I got left, and do I owe
 * anything" is the question a member opens this screen with, so it is the
 * only thing wearing colour. Everything below is neutral, and the eye reads
 * downward from it.
 *
 * Sections with nothing to say are not rendered. A member three days into a
 * package has no measurements and no payment history, and four cards telling
 * them so is worse than a short page.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import {
  CalendarDays, Wallet, Dumbbell, TrendingDown, TrendingUp, Minus,
  User, Phone, Mail, Target, Ruler, CheckCircle2, Clock, CreditCard,
  ChevronRight, ShieldCheck, Home, LogOut,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { api } from '@/lib/api';
import type { MeProfile, MeMembership, MePayment, MeAttendance, MeMeasurement } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const C = {
  primary: palette.blue[500],
  primaryDeep: palette.blue[700],
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger: palette.red[500],
  ink: palette.gray[900],
  muted: palette.gray[500],
};
const EASE = [0.16, 1, 0.3, 1] as const;

const num = (v: unknown) => Number(v ?? 0) || 0;
const inr = (v: unknown) => '₹' + num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/** "12 Mar 2026", or null. Never "Invalid Date". */
function longDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Whole days from now until `end`, or null when there is no end date.
 *
 * Derived here rather than read from a field: the old page rendered
 * `days_remaining` from an endpoint that never returned it, which is exactly
 * how the card came to print the word "days" with nothing in front of it.
 */
function daysLeft(end: string | null | undefined): number | null {
  if (!end) return null;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(23, 59, 59, 999) - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function MemberDashboardPage() {
  return (
    <Guard role="member">
      <MemberDashboard />
    </Guard>
  );
}

function MemberDashboard() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [plan, setPlan] = useState<MeMembership | null>(null);
  const [payments, setPayments] = useState<MePayment[]>([]);
  const [visits, setVisits] = useState<MeAttendance[]>([]);
  const [weights, setWeights] = useState<MeMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Settled, not all: one endpoint being unavailable costs that section,
      // not the page. The old version wrapped every call in a single try and
      // fell back to a blank screen whenever any of them failed.
      const [p, mem, pay, att, meas] = await Promise.allSettled([
        api.me.profile(), api.me.membership(), api.me.payments(),
        api.me.attendance(), api.me.measurements(),
      ]);
      if (!alive) return;
      if (p.status === 'fulfilled') setProfile(p.value.data); else setFailed(true);
      if (mem.status === 'fulfilled') setPlan(mem.value.data);
      if (pay.status === 'fulfilled') setPayments(pay.value.data ?? []);
      if (att.status === 'fulfilled') setVisits(att.value.data ?? []);
      if (meas.status === 'fulfilled') setWeights(meas.value.data ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <Skeleton />;

  if (failed || !profile) {
    return (
      <Shell>
        <div className="rounded-[18px] p-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-[14px] font-[700]" style={{ color: C.ink }}>We could not load your profile</p>
          <p className="mt-1.5 text-[12.5px]" style={{ color: C.muted }}>
            Refresh the page, and tell your trainer if it keeps happening.
          </p>
        </div>
      </Shell>
    );
  }

  const left = daysLeft(profile.pt_end_date);
  const balance = num(plan?.balance_amount);
  const total = num(plan?.final_amount);
  const paid = num(plan?.paid_amount);
  const endsOn = longDate(profile.pt_end_date);

  // Share of the package elapsed. Drawn only when both ends are known — a bar
  // with one endpoint guessed is a bar that lies about how much time is left.
  const startMs = profile.pt_start_date ? new Date(profile.pt_start_date).getTime() : NaN;
  const endMs = profile.pt_end_date ? new Date(profile.pt_end_date).getTime() : NaN;
  const spanPct = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
    ? Math.min(100, Math.max(0, ((Date.now() - startMs) / (endMs - startMs)) * 100))
    : null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const visitsThisMonth = visits.filter((v) => (v.date ?? '').slice(0, 7) === thisMonth).length;

  // Measurements arrive newest-first, so the oldest reading is the last one.
  const latestWeight = weights[0] ? num(weights[0].weight_kg)
    : (profile.weight != null ? num(profile.weight) : null);
  const firstWeight = weights.length > 1 ? num(weights[weights.length - 1].weight_kg) : null;
  const weightDelta = latestWeight != null && firstWeight != null ? latestWeight - firstWeight : null;

  return (
    <Shell>
      {/* ── Who you are ──────────────────────────────────────────────────── */}
      <m.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mb-3 flex items-center gap-3"
      >
        <ClientAvatar
          name={profile.name}
          photoUrl={profile.photo_url}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[17px] font-[800]"
          style={{ background: rgba(C.primary, 0.12), color: C.primary }}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: C.ink }}>
            {profile.name}
          </h1>
          <p className="mt-0.5 truncate text-[12px] font-[600]" style={{ color: C.muted }}>
            {profile.studio_name || 'Your studio'}
            {profile.member_code ? ` · #${profile.member_code}` : ''}
          </p>
        </div>
      </m.div>

      {/* ── The plan. The one saturated surface on the page. ─────────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: EASE }}
        className="mb-4 overflow-hidden rounded-[22px] p-5"
        style={{
          background: `linear-gradient(150deg, ${C.primaryDeep} 0%, ${C.primary} 62%, ${C.primaryDeep} 100%)`,
          boxShadow: `0 14px 34px -12px ${rgba(C.primary, 0.55)}`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-[750] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.62)' }}>
              Current plan
            </p>
            <p className="mt-1 truncate text-[17px] font-[800] text-white">
              {profile.package_type || 'Personal Training'}
            </p>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-[750] uppercase tracking-[0.08em] text-white"
            style={{ background: profile.status === 'active' ? 'rgba(255,255,255,0.20)' : rgba(C.danger, 0.9) }}>
            {profile.status || 'active'}
          </span>
        </div>

        {/* A real number, or an honest absence. The old card printed the unit
            with nothing in front of it. */}
        <div className="mt-4">
          {left !== null ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[34px] font-[880] leading-none tabular-nums text-white">{left}</span>
                <span className="text-[13px] font-[650]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  day{left === 1 ? '' : 's'} left
                </span>
              </div>
              {spanPct !== null && (
                <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <m.div className="h-full rounded-full" style={{ background: '#fff' }}
                    initial={{ width: 0 }} animate={{ width: `${spanPct}%` }}
                    transition={{ duration: 0.7, ease: EASE }} />
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] font-[600]" style={{ color: 'rgba(255,255,255,0.72)' }}>
              No end date set — ask your trainer.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PlanCell label="Ends on" value={endsOn ?? 'Not set'} />
          <PlanCell label="Balance" value={balance > 0 ? inr(balance) : 'Paid up'}
            tone={balance > 0 ? '#FCD34D' : undefined} />
        </div>

        {balance > 0 && (
          <Link href="/member/payments"
            className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-[13px] text-[13px] font-[750]"
            style={{ background: '#fff', color: C.primaryDeep }}>
            <CreditCard size={15} /> Pay {inr(balance)}
          </Link>
        )}
      </m.section>

      {/* ── Progress. Only what was actually measured. ───────────────────── */}
      <Section title="Your progress">
        <div className="grid grid-cols-3 gap-2.5">
          <Metric icon={<Dumbbell size={13} />} label="Visits" value={String(visitsThisMonth)} sub="this month" />
          <Metric icon={<Ruler size={13} />} label="Weight"
            value={latestWeight != null ? `${latestWeight} kg` : '—'}
            sub={latestWeight != null ? 'latest' : 'not recorded'} />
          <Metric
            icon={weightDelta == null ? <Minus size={13} />
              : weightDelta < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            label="Change"
            value={weightDelta == null ? '—' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
            sub={weightDelta == null ? 'needs 2 readings' : 'since first'}
            tone={weightDelta == null ? undefined : weightDelta < 0 ? C.success : C.warning}
          />
        </div>
      </Section>

      {/* ── Trainer, when one is assigned ────────────────────────────────── */}
      {profile.trainer_name && (
        <Section title="Your trainer">
          <div className="flex items-center gap-3 rounded-[16px] p-3.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <ClientAvatar
              name={profile.trainer_name}
              photoUrl={profile.trainer_photo}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-[800]"
              style={{ background: rgba(C.primary, 0.12), color: C.primary }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-[750]" style={{ color: C.ink }}>{profile.trainer_name}</p>
              <p className="truncate text-[11.5px] font-[550]" style={{ color: C.muted }}>
                {profile.trainer_specialization || 'Personal trainer'}
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ── Recent visits ────────────────────────────────────────────────── */}
      {visits.length > 0 && (
        <Section title="Recent visits">
          <div className="overflow-hidden rounded-[16px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {visits.slice(0, 4).map((v, i, arr) => (
              <div key={v.id} className="flex items-center gap-2.5 px-3.5 py-2.5"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <CheckCircle2 size={14} style={{ color: C.success }} />
                <span className="flex-1 text-[12.5px] font-[650]" style={{ color: C.ink }}>
                  {longDate(v.date) ?? v.date}
                </span>
                <span className="text-[11px] font-[550]" style={{ color: C.muted }}>
                  {v.check_in_time
                    ? new Date(v.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Payments ─────────────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <Section title="Payments" action={{ href: '/member/payments', label: 'All' }}>
          <div className="overflow-hidden rounded-[16px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {payments.slice(0, 4).map((p, i, arr) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3.5 py-2.5"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <Wallet size={14} style={{ color: C.success }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-[700]" style={{ color: C.ink }}>{inr(p.amount)}</p>
                  <p className="text-[10.5px] font-[550]" style={{ color: C.muted }}>
                    {longDate(p.date) ?? p.date}
                    {p.payment_method ? ` · ${p.payment_method.replace(/_/g, ' ').toLowerCase()}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <p className="mt-2 text-[11px] font-[600]" style={{ color: C.muted }}>
              {inr(paid)} paid of {inr(total)}
            </p>
          )}
        </Section>
      )}

      {/* ── The rest of the record ───────────────────────────────────────── */}
      <Section title="Your details">
        <div className="overflow-hidden rounded-[16px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Detail icon={<Target size={13} />} label="Goal" value={profile.goal} />
          <Detail icon={<CalendarDays size={13} />} label="Member since" value={longDate(profile.joining_date)} />
          <Detail icon={<Clock size={13} />} label="Started" value={longDate(profile.pt_start_date)} />
          <Detail icon={<Ruler size={13} />} label="Height" value={profile.height ? `${profile.height} cm` : null} />
          <Detail icon={<Mail size={13} />} label="Email" value={profile.email} />
          <Detail icon={<Phone size={13} />} label="Mobile" value={profile.mobile} />
          <Detail icon={<User size={13} />} label="Date of birth" value={longDate(profile.dob)} last />
        </div>
      </Section>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10.5px] font-[600]" style={{ color: C.muted }}>
        <ShieldCheck size={11} /> Only you and your studio can see this
      </p>
    </Shell>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/**
 * The three places a member can actually go, plus the way out.
 *
 * The page this replaced had a five-tab bar, but four of the tabs only set
 * React state that nothing read — tapping Classes, Bookings, Plan or Profile
 * did nothing at all. Rebuilding the page without a nav then removed even the
 * one that worked, and left no way to sign out, which is worse than a bar
 * with dead buttons.
 *
 * So: real links to the routes that exist, and nothing else. Three working
 * tabs beat five that mostly do not.
 */
const MEMBER_TABS = [
  { href: '/member/dashboard', label: 'Home', icon: Home },
  { href: '/member/classes', label: 'Classes', icon: CalendarDays },
  { href: '/member/payments', label: 'Payments', icon: Wallet },
] as const;

function MemberNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  return (
    <nav
      // A fixed bar at the bottom of the viewport: a downward drag that starts
      // here is somebody reaching for a tab, not asking to refresh. Same
      // opt-out MobileBottomNav carries, and the guard test that just caught
      // this missing is the reason it exists.
      data-no-pull-refresh
      // .mobile-bottom-nav rather than Tailwind's bottom-0, so this bar takes
      // its bottom from --vv-bottom-inset exactly as the staff nav does. It
      // was pinned at a plain bottom-0, which meant the iOS fix in the staff
      // shell stopped at the portal boundary and members kept the bug.
      className="mobile-bottom-nav fixed inset-x-0 z-40"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[560px]">
        {MEMBER_TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
              style={{ color: active ? C.primary : C.muted }}>
              <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
              <span className="text-[10px] font-[700]">{label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => logout()}
          className="flex flex-1 flex-col items-center gap-1 py-2.5"
          style={{ color: C.muted }}>
          <LogOut size={18} strokeWidth={1.9} />
          <span className="text-[10px] font-[700]">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-canvas)' }}>
      {/* Top to bottom: the phone's own status-bar inset, then the page, then
          the tab bar — the same order the staff shell uses.
          The inset was missing entirely. This portal has no top bar of its own
          to carry it (the staff shell's fixed header pays it, and /member/classes
          pays it on .member-header), and the app renders with viewport-fit=cover
          under a translucent status bar, so on a notched phone the first card
          started underneath the clock. pt-5 stays as the gap BELOW the inset,
          rather than being the only thing standing in for it. */}
      <div
        className="mx-auto w-full max-w-[560px] px-4 pt-5"
        style={{
          marginTop: 'env(safe-area-inset-top, 0px)',
          // Clears the fixed bar plus the home indicator, so the last card is
          // fully scrollable into view rather than sitting under it.
          paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </div>
      <MemberNav />
    </div>
  );
}

function Section({ title, action, children }: {
  title: string; action?: { href: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-[780] uppercase tracking-[0.13em]" style={{ color: C.muted }}>{title}</h2>
        {action && (
          <Link href={action.href} className="flex items-center gap-0.5 text-[11px] font-[700]" style={{ color: C.primary }}>
            {action.label} <ChevronRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function PlanCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[13px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.13)' }}>
      <p className="text-[8.5px] font-[750] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.62)' }}>
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-[780]" style={{ color: tone ?? '#fff' }}>{value}</p>
    </div>
  );
}

function Metric({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub: string; tone?: string;
}) {
  return (
    <div className="rounded-[16px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[8px]"
        style={{ background: rgba(tone ?? C.primary, 0.12), color: tone ?? C.primary }}>
        {icon}
      </span>
      <p className="mt-2 text-[9px] font-[720] uppercase tracking-[0.1em]" style={{ color: C.muted }}>{label}</p>
      <p className="mt-0.5 text-[17px] font-[840] leading-none tabular-nums tracking-[-0.02em]"
        style={{ color: tone ?? C.ink }}>
        {value}
      </p>
      <p className="mt-1 text-[9.5px] font-[550]" style={{ color: C.muted }}>{sub}</p>
    </div>
  );
}

/**
 * A row of the record. Shows an em dash rather than hiding the row, so a
 * member can see what their studio is still missing from them — a blank they
 * can fill is more useful than a row that silently disappeared.
 */
function Detail({ icon, label, value, last }: {
  icon: React.ReactNode; label: string; value: string | null | undefined; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5"
      style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: C.muted }}>{icon}</span>
      <span className="flex-1 text-[12px] font-[600]" style={{ color: C.muted }}>{label}</span>
      <span className="max-w-[55%] truncate text-right text-[12.5px] font-[680]"
        style={{ color: value ? C.ink : C.muted }}>
        {value || '—'}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <Shell>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-[52px] w-[52px] animate-pulse rounded-full" style={{ background: 'var(--bg-subtle)' }} />
        <div className="flex-1">
          <div className="h-4 w-2/5 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
        </div>
      </div>
      <div className="mb-4 h-[210px] animate-pulse rounded-[22px]" style={{ background: 'var(--bg-subtle)' }} />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-[16px]" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
    </Shell>
  );
}
