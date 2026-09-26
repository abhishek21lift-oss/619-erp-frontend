'use client';
/**
 * Member — Records & streaks.
 *
 * The weekly training streak, lifetime totals, milestones, recent personal
 * bests and the heaviest set for every exercise. All of it is counted by the
 * server from the sessions the trainer logged and the member's studio visits.
 *
 * A milestone earned since this member last opened the page is celebrated
 * once. "Last seen" is remembered in this browser only; losing it (private
 * window, cleared storage) just means no celebration, never a false one.
 */

import { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Award, CalendarCheck, Dumbbell, Flame, Lock, Medal, PartyPopper, Trophy, Weight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EASE, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, Stat, longDate,
} from '@/components/member/MemberUI';
import {
  type Milestone, type MilestoneKind, milestones, nextMilestone, remainingLabel, tonnes,
} from '@/components/member/milestones';
import { api } from '@/lib/api';
import type { MeAchievements, MeLift } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

export default function MemberRecordsPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <RecordsBody />
      </MemberShell>
    </Guard>
  );
}

const SEEN_KEY = 'member.milestones.seen';
const KIND_ICON: Record<MilestoneKind, LucideIcon> = {
  sessions: Dumbbell, prs: Trophy, volume: Weight, streak: Flame,
};
const PR_KIND: Record<string, string> = { weight: 'Heaviest', reps: 'Most reps', volume: 'Best volume' };

function lift(l: MeLift): string {
  if (l.weight_kg == null) return l.reps != null ? `${l.reps} reps` : '—';
  return `${Math.round(l.weight_kg * 10) / 10} kg${l.reps ? ` × ${l.reps}` : ''}`;
}

function readSeen(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(ids: string[]) {
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* per-browser nicety only */ }
}

function RecordsBody() {
  const [data, setData] = useState<MeAchievements | null>(null);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState<Milestone[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api.me.achievements().then((r) => setData(r.data)).catch(() => setFailed(true));
  }, []);

  const list = useMemo(() => (data ? milestones(data) : []), [data]);

  // Celebrate what was earned since the last visit — but never on the very
  // first visit, when everything already earned would look "new".
  useEffect(() => {
    if (list.length === 0) return;
    const earned = list.filter((x) => x.earned).map((x) => x.id);
    const seen = readSeen();
    if (seen) setFresh(list.filter((x) => x.earned && !seen.has(x.id)));
    writeSeen(earned);
  }, [list]);

  const title = <PageTitle icon={<Medal size={20} />} title="Records" sub="Streaks, milestones and personal bests" />;
  if (failed) return <>{title}<LoadError what="records" /></>;
  if (!data) return <PageSkeleton />;

  const next = nextMilestone(list);
  const earnedCount = list.filter((x) => x.earned).length;
  // Earned badges, plus the next one of each kind: the goal in sight, not
  // a wall of padlocks.
  const shown = showAll ? list : list.filter((x, i) => x.earned
    || list.findIndex((y) => y.kind === x.kind && !y.earned) === i);

  if (data.totals.sessions === 0 && data.totals.visits === 0) {
    return (
      <>
        {title}
        <EmptyState icon={<Medal size={18} />} title="Your records start with your first session"
          body="Once your trainer logs a session, your streak, personal bests and milestones appear here." />
      </>
    );
  }

  return (
    <>
      {title}

      <AnimatePresence>
        {fresh.length > 0 && (
          <m.div role="status"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }}
            className="mb-4 flex items-center gap-3 rounded-[16px] p-3.5"
            style={{ background: rgba(palette.emerald[500], 0.12), border: `1px solid ${rgba(palette.emerald[500], 0.32)}` }}>
            <m.span aria-hidden initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.15 }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              style={{ background: palette.emerald[500], color: '#fff' }}>
              <PartyPopper size={18} />
            </m.span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-[800]" style={{ color: MC.ink }}>
                {fresh.length === 1 ? 'New milestone!' : `${fresh.length} new milestones!`}
              </p>
              <p className="truncate text-[12px]" style={{ color: MC.muted }}>{fresh.map((x) => x.title).join(' · ')}</p>
            </div>
            <button type="button" onClick={() => setFresh([])} className="text-[11.5px] font-[720]" style={{ color: MC.muted }}>
              Nice
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <StreakHero a={data} />

      <div className="mb-4 grid grid-cols-4 gap-2">
        <Stat label="Sessions" value={String(data.totals.sessions)} />
        <Stat label="PRs" value={String(data.totals.prs)} />
        <Stat label="Lifted" value={tonnes(data.totals.volume_kg)} />
        <Stat label="Visits" value={String(data.totals.visits)} />
      </div>

      {next && (
        <Section title="Next milestone">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Badge ms={next} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>{next.title}</p>
                <p className="text-[12px]" style={{ color: MC.muted }}>{remainingLabel(next)}</p>
              </div>
            </div>
            <Progress value={next.value} target={next.target} label={next.title} />
          </Card>
        </Section>
      )}

      <Section title="Milestones" aside={
        <span className="text-[11px] font-[650] tabular-nums" style={{ color: MC.muted }}>{earnedCount} of {list.length}</span>
      }>
        <ul className="grid grid-cols-3 gap-2">
          {shown.map((ms, i) => (
            <m.li key={ms.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.3, ease: EASE }}
              className="flex flex-col items-center rounded-[14px] px-2 py-3 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', opacity: ms.earned ? 1 : 0.72 }}>
              <Badge ms={ms} size={38} />
              <p className="mt-2 text-[11.5px] font-[750] leading-tight" style={{ color: MC.ink }}>{ms.title}</p>
              <p className="mt-0.5 text-[10px] leading-tight" style={{ color: MC.muted }}>
                {ms.earned ? 'Earned' : ms.detail}
              </p>
            </m.li>
          ))}
        </ul>
        {shown.length < list.length || showAll ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}
            className="mt-2 w-full rounded-[12px] py-2 text-[12px] font-[720]" style={{ color: MC.primary }}>
            {showAll ? 'Show fewer' : `Show all ${list.length} milestones`}
          </button>
        ) : null}
      </Section>

      {data.recent_prs.length > 0 && (
        <Section title="Recent personal bests">
          <Card>
            {data.recent_prs.map((p, i, arr) => (
              <div key={`${p.exercise}-${p.date}-${i}`} className="flex items-center gap-3 px-4 py-3"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ background: rgba(palette.emerald[500], 0.14), color: palette.emerald[600] }}>
                  <Trophy size={14} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-[720]" style={{ color: MC.ink }}>{p.exercise}</p>
                  <p className="text-[11.5px]" style={{ color: MC.muted }}>{PR_KIND[p.kind] ?? 'Personal best'} · {longDate(p.date)}</p>
                </div>
                <span className="shrink-0 text-[13px] font-[800] tabular-nums" style={{ color: MC.ink }}>{lift(p)}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {data.records.length > 0 && (
        <Section title="Best lifts">
          <Card>
            {data.records.map((r, i, arr) => (
              <div key={r.exercise} className="flex items-center justify-between gap-3 px-4 py-2.5"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-[700]" style={{ color: MC.ink }}>{r.exercise}</p>
                  <p className="text-[11px]" style={{ color: MC.muted }}>{longDate(r.date)}</p>
                </div>
                <span className="shrink-0 text-[13px] font-[800] tabular-nums" style={{ color: MC.ink }}>{lift(r)}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}

function StreakHero({ a }: { a: MeAchievements }) {
  const { current, longest, this_week: thisWeek } = a.training;
  const line = current === 0
    ? 'Train this week to start a streak.'
    : thisWeek
      ? 'This week is done — keep it going next week.'
      : 'Train this week to keep your streak alive.';
  return (
    <m.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mb-4 overflow-hidden rounded-[22px] p-5 text-white"
      style={{
        background: `linear-gradient(150deg, ${MC.primaryDeep} 0%, ${MC.primary} 62%, ${MC.primaryDeep} 100%)`,
        boxShadow: `0 14px 34px -12px ${rgba(MC.primary, 0.55)}`,
      }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9.5px] font-[750] uppercase tracking-[0.16em] text-white/70">Training streak</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[44px] font-[880] leading-none tabular-nums">{current}</span>
            <span className="text-[14px] font-[700] text-white/85">week{current === 1 ? '' : 's'}</span>
          </p>
        </div>
        <m.span aria-hidden
          animate={current > 0 ? { scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Flame size={30} />
        </m.span>
      </div>
      <p className="mt-3 text-[12.5px] font-[650] text-white/90">{line}</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <HeroCell icon={Award} label="Longest" value={`${longest} week${longest === 1 ? '' : 's'}`} />
        <HeroCell icon={CalendarCheck} label="Check-in streak"
          value={`${a.checkins.current} week${a.checkins.current === 1 ? '' : 's'}`} />
      </div>
    </m.section>
  );
}

function HeroCell({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[13px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.16)' }}>
      <p className="flex items-center gap-1 text-[9px] font-[750] uppercase tracking-[0.1em] text-white/70">
        <Icon size={10} aria-hidden /> {label}
      </p>
      <p className="mt-1 text-[15px] font-[820] tabular-nums">{value}</p>
    </div>
  );
}

function Badge({ ms, size }: { ms: Milestone; size: number }) {
  const Icon = ms.earned ? KIND_ICON[ms.kind] : Lock;
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size, height: size,
        background: ms.earned
          ? `linear-gradient(145deg, ${palette.emerald[400]}, ${palette.emerald[600]})`
          : 'var(--bg-subtle)',
        color: ms.earned ? '#fff' : 'var(--text-muted)',
        boxShadow: ms.earned ? `0 6px 14px -6px ${rgba(palette.emerald[500], 0.7)}` : undefined,
      }}>
      <Icon size={Math.round(size * 0.42)} />
    </span>
  );
}

function Progress({ value, target, label }: { value: number; target: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / target) * 100));
  return (
    <div className="mt-3">
      <div role="progressbar" aria-label={`Progress to ${label}`} aria-valuemin={0} aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
        <m.div className="h-full rounded-full" style={{ background: MC.primary }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} />
      </div>
      <p className="mt-1.5 text-right text-[10.5px] font-[650] tabular-nums" style={{ color: MC.muted }}>
        {Math.round(pct)}%
      </p>
    </div>
  );
}
