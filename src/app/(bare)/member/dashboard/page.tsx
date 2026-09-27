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
  CalendarDays, TrendingDown, TrendingUp, Minus,
  Ruler, CheckCircle2, CreditCard,
  ChevronRight, ShieldCheck, MessageCircle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import PayBalanceButton from '@/components/member/PayBalanceButton';
import TodayCard from '@/components/member/TodayCard';
import InstallAppCard from '@/components/member/InstallAppCard';
import HomeHighlights from '@/components/member/HomeHighlights';
import RenewalBanner from '@/components/member/RenewalBanner';
import HomeHero from '@/components/member/HomeHero';
import { accentGradient, spectrum } from '@/components/member/memberTheme';
import type { Accent } from '@/components/member/memberTheme';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { api } from '@/lib/api';
import type { MeAchievements, MeProfile, MeMembership, MeAttendance, MeMeasurement } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';
import { daysLeft, elapsedPct } from '@/components/member/planDates';

const C = {
  primary: palette.blue[500],
  primaryDeep: palette.blue[700],
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger: palette.red[500],
  // Theme tokens, not fixed greys: gray-900 ink was invisible on the dark canvas.
  ink: 'var(--text-primary)',
  muted: 'var(--text-muted)',
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
  // null until attendance loads (or when it fails): the hero shows a dash, not a false 0.
  const [visits, setVisits] = useState<MeAttendance[] | null>(null);
  const [weights, setWeights] = useState<MeMeasurement[]>([]);
  const [achievements, setAchievements] = useState<MeAchievements | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // The hero's streak. Loaded on its own so a slow or failed read costs one
  // number, never the page.
  useEffect(() => {
    let alive = true;
    api.me.achievements().then((r) => { if (alive) setAchievements(r.data); }).catch(() => { /* streak shows a dash */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Settled, not all: one endpoint being unavailable costs that section,
      // not the page. The old version wrapped every call in a single try and
      // fell back to a blank screen whenever any of them failed.
      const [p, mem, att, meas] = await Promise.allSettled([
        api.me.profile(), api.me.membership(),
        api.me.attendance(), api.me.measurements(),
      ]);
      if (!alive) return;
      if (p.status === 'fulfilled') setProfile(p.value.data); else setFailed(true);
      if (mem.status === 'fulfilled') setPlan(mem.value.data);
      if (att.status === 'fulfilled') setVisits(att.value.data ?? []);
      // A studio measurement can record body sizes with no weight; only rows
      // that carry one belong in the weight figures.
      if (meas.status === 'fulfilled') {
        setWeights((meas.value.data ?? []).filter((r) => r.weight_kg !== null && r.weight_kg !== ''));
      }
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

  // The package record is the source of truth; the client row's copy is the fallback.
  const endDate = plan?.pt_end_date ?? profile.pt_end_date;
  const startDate = plan?.pt_start_date ?? profile.pt_start_date;
  const left = daysLeft(endDate);
  const balance = num(plan?.balance_amount);
  const endsOn = longDate(endDate);

  const spanPct = elapsedPct(startDate, endDate);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const visitsThisMonth = visits ? visits.filter((v) => (v.date ?? '').slice(0, 7) === thisMonth).length : null;

  // Measurements arrive newest-first, so the oldest reading is the last one.
  const latestWeight = weights[0] ? num(weights[0].weight_kg)
    : (profile.weight != null ? num(profile.weight) : null);
  const firstWeight = weights.length > 1 ? num(weights[weights.length - 1].weight_kg) : null;
  const weightDelta = latestWeight != null && firstWeight != null ? latestWeight - firstWeight : null;

  return (
    <Shell>
      {/* ── The hero: who, where they stand, what next ─────────────────── */}
      <HomeHero
        name={profile.name}
        photoUrl={profile.photo_url}
        studio={[profile.studio_name, profile.member_code ? `#${profile.member_code}` : null].filter(Boolean).join(' · ') || null}
        streak={achievements ? achievements.training.current : null}
        trainedThisWeek={achievements ? achievements.training.this_week : null}
        visitsThisMonth={visitsThisMonth}
        daysLeft={left}
        sessions={achievements ? achievements.totals.sessions : null}
      />

      {/* ── A renewal offer to pay, or a plan about to run out ──────────────── */}
      <RenewalBanner />

      {/* ── What to do today ─────────────────────────────────────────────── */}
      <TodayCard />

      {/* ── Offer the installable app, when the browser can install it ─────── */}
      <InstallAppCard />

      {/* ── The plan: dates, balance, and paying it ─────────────────────── */}
      <m.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: EASE }}
        aria-label="Your plan"
        className="relative mb-5 overflow-hidden rounded-[24px] p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(spectrum.pink[400], 0.18)}, transparent 70%)` }} />
        <div className="relative flex items-center gap-4">
          <PlanRing left={left} remaining={spanPct == null ? null : 1 - spanPct / 100} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-[750] uppercase tracking-[0.14em]" style={{ color: C.muted }}>Current plan</p>
            <p className="mt-0.5 truncate text-[18px] font-[820] leading-tight" style={{ color: C.ink }}>
              {profile.package_type || 'Personal Training'}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[750] capitalize"
              style={{ background: 'var(--bg-subtle)', color: C.ink }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full"
                style={{ background: profile.status === 'active' || !profile.status ? C.success : C.danger }} />
              {profile.status || 'active'}
            </span>
          </div>
        </div>

        {/* A real number, or an honest absence. */}
        {left === null && (
          <p className="relative mt-4 text-[13px] font-[600]" style={{ color: C.muted }}>No end date set — ask your trainer.</p>
        )}

        <div className="relative mt-4 grid grid-cols-2 overflow-hidden rounded-[16px]"
          style={{ background: 'var(--bg-subtle)' }}>
          <PlanCell label="Ends on" value={endsOn ?? 'Not set'} />
          <PlanCell label="Balance" value={balance > 0 ? inr(balance) : 'Paid up'} divider
            tone={balance > 0 ? palette.amber[600] : C.success} />
        </div>

        {balance > 0 && (
          <PayBalanceButton
            className="relative mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-[800] text-white"
            style={{ background: accentGradient('plan'), boxShadow: `0 10px 24px -12px ${rgba(spectrum.pink[500], 0.7)}` }}>
            <CreditCard size={15} /> Pay {inr(balance)}
          </PayBalanceButton>
        )}
      </m.section>

      {/* ── The month so far, and the goal closest to done ────────────────── */}
      <HomeHighlights />

      {/* ── Progress. Only what was actually measured. ───────────────────── */}
      <Section title="Your progress" action={{ href: '/member/progress', label: 'See trend' }}>
        <div className="grid grid-cols-2 gap-2.5">
          <Metric icon={<Ruler size={15} />} label="Weight" accent="progress"
            value={latestWeight != null ? `${latestWeight} kg` : '—'}
            sub={latestWeight != null ? 'latest' : 'not recorded'} />
          <Metric
            icon={weightDelta == null ? <Minus size={15} />
              : weightDelta < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
            label="Change" accent="records"
            value={weightDelta == null ? '—' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
            sub={weightDelta == null ? 'needs 2 readings' : 'since first'}
            tone={weightDelta == null ? undefined : weightDelta < 0 ? C.success : C.warning}
          />
        </div>
      </Section>

      {/* ── Trainer, when one is assigned ────────────────────────────────── */}
      {profile.trainer_name && (
        <Section title="Your trainer">
          <div className="flex items-center gap-3 rounded-[18px] p-3.5"
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
            <Link href="/member/messages"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12.5px] font-[750] text-white transition-transform active:scale-95"
              style={{ background: C.primary }}>
              <MessageCircle size={14} aria-hidden /> Message
            </Link>
          </div>
        </Section>
      )}

      {/* ── Recent visits ────────────────────────────────────────────────── */}
      {visits && visits.length > 0 && (
        <Section title="Recent visits">
          <div className="overflow-hidden rounded-[18px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {visits.slice(0, 4).map((v, i, arr) => (
              <div key={v.id} className="flex min-h-[48px] items-center gap-3 px-4 py-2.5"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <CheckCircle2 size={16} style={{ color: C.success }} aria-hidden />
                <span className="flex-1 text-[14px] font-[650]" style={{ color: C.ink }}>
                  {longDate(v.date) ?? v.date}
                </span>
                <span className="text-[12px] font-[600] tabular-nums" style={{ color: C.muted }}>
                  {v.check_in_time
                    ? new Date(v.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-[600]" style={{ color: C.muted }}>
        <ShieldCheck size={12} aria-hidden /> Only you and your studio can see this
      </p>
    </Shell>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/** Thin alias kept so the many call sites in this file stay untouched; the
 *  shell itself is shared with the rest of the portal now. */
function Shell({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}

function Section({ title, action, children }: {
  title: string; action?: { href: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-[780] uppercase tracking-[0.12em]" style={{ color: C.muted }}>{title}</h2>
        {action && (
          <Link href={action.href} className="-my-2 flex min-h-[44px] items-center gap-0.5 text-[12px] font-[750]" style={{ color: C.primary }}>
            {action.label} <ChevronRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function PlanCell({ label, value, tone, divider = false }: { label: string; value: string; tone?: string; divider?: boolean }) {
  return (
    <div className="px-3.5 py-3" style={divider ? { borderLeft: '1px solid var(--border)' } : undefined}>
      <p className="text-[11px] font-[650]" style={{ color: C.muted }}>{label}</p>
      <p className="mt-1 truncate text-[15px] font-[800] tabular-nums" style={{ color: tone ?? C.ink }}>{value}</p>
    </div>
  );
}

/** Days left, as a ring that empties across the plan — the member app's gradient, amber once it has ended. */
function PlanRing({ left, remaining }: { left: number | null; remaining: number | null }) {
  const R = 34;
  const CIRC = 2 * Math.PI * R;
  const ended = left === 0;
  return (
    <div className="relative grid h-[84px] w-[84px] shrink-0 place-items-center">
      <svg viewBox="0 0 84 84" className="absolute inset-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="plan-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={spectrum.violet[500]} />
            <stop offset="100%" stopColor={spectrum.pink[500]} />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={R} fill="none" stroke="var(--bg-subtle)" strokeWidth="7" />
        {remaining != null && (
          <m.circle cx="42" cy="42" r={R} fill="none" stroke={ended ? palette.amber[500] : 'url(#plan-ring)'}
            strokeWidth="7" strokeLinecap="round" strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }} animate={{ strokeDashoffset: CIRC * (1 - remaining) }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }} />
        )}
      </svg>
      {left != null ? (
        <p className="text-center leading-none">
          <span className="block text-[24px] font-[850] tabular-nums tracking-[-0.02em]" style={{ color: C.ink }}>{left}</span>
          <span className="mt-1 block text-[11px] font-[650]" style={{ color: C.muted }}>day{left === 1 ? '' : 's'} left</span>
        </p>
      ) : (
        <CalendarDays size={22} aria-hidden style={{ color: C.muted }} />
      )}
    </div>
  );
}

function Metric({ icon, label, value, sub, tone, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; tone?: string; accent: Accent;
}) {
  return (
    <div className="rounded-[20px] p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[11px] text-white"
        style={{ background: accentGradient(accent) }}>
        {icon}
      </span>
      <p className="mt-2.5 text-[20px] font-[840] leading-none tabular-nums tracking-[-0.02em]"
        style={{ color: tone ?? C.ink }}>
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-[700]" style={{ color: C.ink }}>{label}</p>
      <p className="text-[11px] font-[550]" style={{ color: C.muted }}>{sub}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <Shell>
      <div className="mb-5 flex items-center gap-3" aria-busy="true" aria-label="Loading">
        <div className="flex-1">
          <div className="h-3 w-1/4 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
          <div className="mt-2 h-6 w-2/5 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
        </div>
        <div className="h-11 w-11 animate-pulse rounded-full" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-12 w-12 animate-pulse rounded-full" style={{ background: 'var(--bg-subtle)' }} />
      </div>
      <div className="mb-4 h-[210px] animate-pulse rounded-[24px]" style={{ background: 'var(--bg-subtle)' }} />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-[18px]" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
    </Shell>
  );
}
