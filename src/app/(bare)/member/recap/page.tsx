'use client';
/**
 * Member — Monthly recap.
 *
 * The month told back to the member: sessions, lifting, records broken, their
 * heaviest lift and favourite exercise, weekday rhythm and weight change —
 * every figure counted by the server from what was logged (GET /api/me/recap).
 *
 * "Play" opens the story (RecapStory) and its shareable card. The same numbers
 * are laid out here as plain cards too, so the story is never the only way to
 * read them.
 */

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { CalendarRange, Dumbbell, Play, Scale, Sparkles, Trophy } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EASE, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, Stat,
} from '@/components/member/MemberUI';
import {
  favouriteDay, headlineStats, isEmptyMonth, kg, monthName, previousMonthOf, versus,
} from '@/components/member/recap';
import { api } from '@/lib/api';
import type { MeRecap } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const RecapStory = dynamic(() => import('@/components/member/RecapStory'), { ssr: false });

export default function MemberRecapPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <RecapBody />
      </MemberShell>
    </Guard>
  );
}

/** ?month=YYYY-MM from the address, read once on the client. */
function monthFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const v = new URLSearchParams(window.location.search).get('month');
  return v && /^\d{4}-\d{2}$/.test(v) ? v : undefined;
}

function RecapBody() {
  const [recap, setRecap] = useState<MeRecap | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const load = (month?: string) => {
    setLoading(true);
    api.me.recap(month)
      .then((r) => { setRecap(r.data); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(monthFromUrl()); }, []);

  const pick = (month: string) => {
    window.history.replaceState(null, '', `?month=${month}`);
    load(month);
  };

  const title = <PageTitle icon={<CalendarRange size={20} />} title="Monthly recap" sub="Your month, from everything logged" />;
  if (failed) return <>{title}<LoadError what="recap" /></>;
  if (!recap) return <PageSkeleton />;

  const empty = isEmptyMonth(recap);
  const months = recap.months.includes(recap.month) ? recap.months : [recap.month, ...recap.months];

  return (
    <>
      {title}

      {months.length > 1 && (
        <nav aria-label="Months" className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <ul className="flex gap-1.5">
            {months.map((mo) => {
              const on = mo === recap.month;
              return (
                <li key={mo}>
                  <button type="button" onClick={() => pick(mo)} aria-current={on ? 'page' : undefined} disabled={loading}
                    className="h-9 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-[750] transition-colors"
                    style={on ? { background: MC.primary, color: '#fff' } : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: MC.ink }}>
                    {monthName(mo)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
        {empty ? (
          <EmptyState icon={<CalendarRange size={20} />} title={`Nothing logged in ${monthName(recap.month)}${recap.in_progress ? ' yet' : ''}`}
            body={recap.in_progress
              ? 'Train with your trainer or log a workout yourself — your recap builds as the month goes.'
              : 'Pick another month above, or start this month strong from the Workout tab.'} />
        ) : (
          <>
            <Hero recap={recap} onPlay={() => setPlaying(true)} />
            <Details recap={recap} />
          </>
        )}
      </div>

      {playing && <RecapStory recap={recap} onClose={() => setPlaying(false)} />}
    </>
  );
}

function Hero({ recap, onPlay }: { recap: MeRecap; onPlay: () => void }) {
  const stats = headlineStats(recap);
  return (
    <m.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
      className="relative mb-4 overflow-hidden rounded-[22px] p-5 text-white"
      style={{ background: `linear-gradient(150deg, ${palette.gray[900]} 0%, ${palette.blue[900]} 55%, ${palette.blue[700]} 100%)` }}>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(palette.blue[400], 0.45)}, transparent 70%)` }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(palette.emerald[500], 0.25)}, transparent 70%)` }} />

      <p className="relative flex items-center gap-1.5 text-[11px] font-[750] uppercase tracking-[0.14em] opacity-80">
        <Sparkles size={13} aria-hidden /> {recap.in_progress ? 'So far this month' : 'Your recap is ready'}
      </p>
      <h2 className="relative mt-1 text-[32px] font-[850] leading-tight tracking-[-0.03em]">{monthName(recap.month)}</h2>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <p className="text-[22px] font-[850] leading-none tabular-nums tracking-[-0.02em]">{s.value}</p>
            <p className="mt-1.5 text-[10px] font-[750] uppercase tracking-[0.1em] opacity-75">{s.label}</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={onPlay}
        className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[800]"
        style={{ background: '#fff', color: palette.gray[900] }}>
        <Play size={16} fill="currentColor" aria-hidden /> Play my recap
      </button>
    </m.section>
  );
}

function Details({ recap }: { recap: MeRecap }) {
  const t = recap.totals;
  const prev = previousMonthOf(recap.month);
  const fav = favouriteDay(recap.weekdays);
  const vs = versus(t.sessions, recap.previous.sessions, prev);

  return (
    <>
      <Section title="Training" aside={vs ? <span className="text-[11px] font-[700]" style={{ color: MC.muted }}>{vs}</span> : null}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Sessions" value={String(t.sessions)} />
          <Stat label="Days" value={String(t.training_days)} />
          <Stat label="Visits" value={String(t.visits)} />
          <Stat label="Sets" value={t.sets.toLocaleString('en-IN')} />
          <Stat label="Reps" value={t.reps.toLocaleString('en-IN')} />
          <Stat label="Volume" value={t.volume_kg >= 1000 ? `${(t.volume_kg / 1000).toFixed(1)} t` : `${t.volume_kg} kg`} />
        </div>
        {(fav || t.self_logged > 0 || t.cardio_minutes > 0) && (
          <p className="mt-2 px-1 text-[12px]" style={{ color: MC.muted }}>
            {[fav ? `Favourite day: ${fav}` : null,
              t.self_logged > 0 ? `${t.self_logged} workout${t.self_logged === 1 ? '' : 's'} logged by you` : null,
              t.cardio_minutes > 0 ? `${t.cardio_minutes} min cardio` : null].filter(Boolean).join(' · ')}
          </p>
        )}
      </Section>

      {(recap.top_lift || recap.favourite) && (
        <Section title="Highlights">
          <Card>
            {recap.top_lift && (
              <Row icon={<Dumbbell size={16} aria-hidden />} label="Heaviest lift"
                value={`${recap.top_lift.exercise} · ${kg(recap.top_lift.weight_kg)}${recap.top_lift.reps ? ` × ${recap.top_lift.reps}` : ''}`} />
            )}
            {recap.favourite && (
              <Row icon={<Sparkles size={16} aria-hidden />} label="Most trained" value={`${recap.favourite.exercise} · ${recap.favourite.sets} sets`} last={!recap.weight} />
            )}
            {recap.weight && (
              <Row icon={<Scale size={16} aria-hidden />} label="Body weight" last
                value={recap.weight.change_kg === null
                  ? `${kg(recap.weight.end_kg)} (one weigh-in)`
                  : `${kg(recap.weight.start_kg)} → ${kg(recap.weight.end_kg)}`} />
            )}
          </Card>
        </Section>
      )}

      {recap.records.length > 0 && (
        <Section title="Records broken">
          <Card>
            {recap.records.map((x, n) => (
              <Row key={`${x.exercise}-${n}`} icon={<Trophy size={16} aria-hidden />} tone={MC.success} label={x.exercise}
                value={`${kg(x.weight_kg)}${x.reps ? ` × ${x.reps}` : ''}`} last={n === recap.records.length - 1} />
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}

function Row({ icon, label, value, tone = MC.primary, last = false }: {
  icon: ReactNode; label: string; value: string; tone?: string; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: rgba(tone, 0.12), color: tone }}>{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-[700]" style={{ color: MC.ink }}>{label}</span>
      <span className="shrink-0 text-right text-[13px] font-[750] tabular-nums" style={{ color: MC.ink }}>{value}</span>
    </div>
  );
}
