'use client';

/**
 * The monthly recap, told as a story: full screen, one figure per slide,
 * segmented progress along the top. Tap the right side (or →) for the next
 * slide, the left side (or ←) for the previous one; press and hold to pause.
 * Slides advance on their own; the last one waits, with Share.
 *
 * Every figure comes from GET /api/me/recap. The page behind this shows the
 * same numbers as plain cards, so nothing here is the only way to read them.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, m, useReducedMotion } from 'framer-motion';
import { Calendar, Dumbbell, Flame, Loader2, Scale, Share2, Trophy, X } from 'lucide-react';
import type { MeRecap } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { palette } from '@/lib/palette';
import {
  WEEKDAYS, favouriteDay, headlineStats, kg, monthName, previousMonthOf, slidesFor, versus, weightTotal,
  type SlideKind,
} from './recap';
import { shareRecapCard } from './recapShareCard';

const SLIDE_MS = 5200;

const BACKDROPS: Record<SlideKind, string> = {
  intro: `linear-gradient(160deg, ${palette.gray[900]} 0%, ${palette.blue[900]} 55%, ${palette.blue[700]} 100%)`,
  sessions: `linear-gradient(160deg, ${palette.blue[800]} 0%, ${palette.blue[500]} 100%)`,
  rhythm: `linear-gradient(160deg, ${palette.gray[900]} 0%, ${palette.gray[700]} 100%)`,
  volume: `linear-gradient(160deg, ${palette.blue[900]} 0%, ${palette.gray[900]} 100%)`,
  top: `linear-gradient(160deg, ${palette.emerald[800]} 0%, ${palette.gray[900]} 100%)`,
  records: `linear-gradient(160deg, ${palette.emerald[700]} 0%, ${palette.emerald[900]} 100%)`,
  favourite: `linear-gradient(160deg, ${palette.blue[700]} 0%, ${palette.gray[900]} 100%)`,
  body: `linear-gradient(160deg, ${palette.gray[800]} 0%, ${palette.blue[800]} 100%)`,
  summary: `linear-gradient(160deg, ${palette.gray[900]} 0%, ${palette.blue[900]} 60%, ${palette.blue[700]} 100%)`,
};

export default function RecapStory({ recap, onClose }: { recap: MeRecap; onClose: () => void }) {
  const slides = slidesFor(recap);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const reduce = useReducedMotion();
  const ref = useDialogA11y({ open: true, onClose });
  const last = i === slides.length - 1;

  const next = useCallback(() => { setI((n) => Math.min(slides.length - 1, n + 1)); setElapsed(0); }, [slides.length]);
  const prev = useCallback(() => { setI((n) => Math.max(0, n - 1)); setElapsed(0); }, []);

  // Auto-advance, paused while held and on the last slide.
  useEffect(() => {
    if (paused || last) return;
    const started = performance.now() - elapsed;
    let raf = 0;
    const tick = (t: number) => {
      const e = t - started;
      if (e >= SLIDE_MS) { next(); return; }
      setElapsed(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `elapsed` is read once to resume from where a pause left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, paused, last, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [next, prev]);

  const kind = slides[i];

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={`${monthName(recap.month)} recap`} data-no-pull-refresh
      className="fixed inset-0 z-[85] flex select-none flex-col text-white"
      style={{ background: BACKDROPS[kind], transition: 'background 0.6s ease' }}>
      {/* Progress segments */}
      <div className="flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]" aria-hidden>
        {slides.map((s, n) => (
          <div key={s} className="h-[3px] flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <div className="h-full rounded-full bg-white"
              style={{ width: n < i ? '100%' : n > i ? '0%' : last ? '100%' : `${Math.min(100, (elapsed / SLIDE_MS) * 100)}%` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[12px] font-[750] uppercase tracking-[0.14em] opacity-80">
          {monthName(recap.month)}{recap.in_progress ? ' so far' : ''}
        </span>
        <button type="button" onClick={onClose} aria-label="Close recap"
          className="grid h-10 w-10 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Tap zones: left third back, the rest forward; hold to pause. */}
        {!last && (
          <div className="absolute inset-0 z-10 flex" aria-hidden
            onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
            {/* Native buttons kept out of the tab order: the sr-only pair below is the keyboard path. */}
            <button type="button" tabIndex={-1} className="h-full w-1/3 cursor-default" onClick={prev} />
            <button type="button" tabIndex={-1} className="h-full w-2/3 cursor-default" onClick={next} />
          </div>
        )}
        {last && i > 0 && <button type="button" tabIndex={-1} aria-hidden className="absolute inset-y-0 left-0 z-10 w-1/4 cursor-default" onClick={prev} />}

        <AnimatePresence mode="wait">
          <m.div key={kind} className="absolute inset-0 flex flex-col justify-center px-7 pb-10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            <Slide kind={kind} r={recap} />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Keyboard and screen-reader navigation; the tap zones cover touch. */}
      <div className="sr-only">
        <button type="button" onClick={prev} disabled={i === 0}>Previous</button>
        <button type="button" onClick={next} disabled={last}>Next</button>
      </div>
    </div>
  );
}

// ── Slides ───────────────────────────────────────────────────────────────────

function Kicker({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[13px] font-[750] uppercase tracking-[0.14em] opacity-80">
      {icon}{children}
    </p>
  );
}

function Big({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  return (
    <p className="text-[96px] font-[850] leading-[0.9] tracking-[-0.05em] tabular-nums sm:text-[96px]">
      <CountUp to={to} decimals={decimals} />{suffix && <span className="ml-2 text-[40px] font-[800] tracking-[-0.02em]">{suffix}</span>}
    </p>
  );
}

function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [to, reduce]);
  return <>{v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-[420px] text-[20px] font-[650] leading-snug opacity-90">{children}</p>;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="mt-5 inline-flex w-fit items-center rounded-full px-3.5 py-1.5 text-[14px] font-[750]"
      style={{ background: 'rgba(255,255,255,0.16)' }}>{children}</span>
  );
}

function Slide({ kind, r }: { kind: SlideKind; r: MeRecap }) {
  const t = r.totals;
  const prevMonth = previousMonthOf(r.month);

  switch (kind) {
    case 'intro':
      return (
        <>
          <Kicker icon={<Calendar size={15} aria-hidden />}>Your monthly recap</Kicker>
          <h2 className="text-[56px] font-[850] leading-[0.95] tracking-[-0.04em]">
            {r.first_name ? `${r.first_name},` : 'Your'}<br />
            {r.first_name ? 'here\'s your ' : ''}{monthName(r.month)}.
          </h2>
          <Sub>{r.in_progress ? 'The month so far, from everything you and your trainer logged.' : 'Everything you and your trainer logged, in one place.'}</Sub>
          <p className="mt-10 text-[13px] font-[650] opacity-70">Tap to continue</p>
        </>
      );

    case 'sessions': {
      const main = t.sessions > 0 ? t.sessions : t.visits;
      const label = t.sessions > 0 ? (t.sessions === 1 ? 'session' : 'sessions') : (t.visits === 1 ? 'visit' : 'visits');
      const vs = t.sessions > 0 ? versus(t.sessions, r.previous.sessions, prevMonth) : null;
      return (
        <>
          <Kicker icon={<Flame size={15} aria-hidden />}>You showed up</Kicker>
          <Big to={main} suffix={label} />
          <Sub>
            {t.training_days > 0 ? `On ${t.training_days} different day${t.training_days === 1 ? '' : 's'}` : ''}
            {t.active_weeks > 0 ? `${t.training_days > 0 ? ', ' : ''}active in ${t.active_weeks} week${t.active_weeks === 1 ? '' : 's'}` : ''}
            {t.self_logged > 0 ? ` — ${t.self_logged} logged by you.` : '.'}
          </Sub>
          {vs && <Pill>{vs}</Pill>}
        </>
      );
    }

    case 'rhythm': {
      const fav = favouriteDay(r.weekdays);
      const max = Math.max(1, ...r.weekdays);
      return (
        <>
          <Kicker icon={<Calendar size={15} aria-hidden />}>Your rhythm</Kicker>
          <h2 className="text-[44px] font-[850] leading-[1] tracking-[-0.03em]">
            {fav ? <>{fav}s were<br />your day.</> : <>You spread it<br />across the week.</>}
          </h2>
          <div className="mt-8 flex h-[180px] items-end gap-2.5" role="img"
            aria-label={`Training days by weekday: ${r.weekdays.map((n, d) => `${WEEKDAYS[d]} ${n}`).join(', ')}`}>
            {r.weekdays.map((n, d) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[13px] font-[800] tabular-nums opacity-90">{n || ''}</span>
                <m.div className="w-full rounded-[8px]"
                  style={{ background: WEEKDAYS[d] === fav ? palette.emerald[400] : 'rgba(255,255,255,0.3)' }}
                  initial={{ height: 4 }} animate={{ height: Math.max(4, (n / max) * 130) }}
                  transition={{ duration: 0.8, delay: 0.15 + d * 0.05, ease: [0.16, 1, 0.3, 1] }} />
                <span className="text-[12px] font-[700] opacity-75">{WEEKDAYS[d].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </>
      );
    }

    case 'volume': {
      const vol = weightTotal(t.volume_kg);
      const vs = versus(t.volume_kg, r.previous.volume_kg, prevMonth, ' kg');
      return (
        <>
          <Kicker icon={<Dumbbell size={15} aria-hidden />}>You moved</Kicker>
          {t.volume_kg > 0
            ? <Big to={vol.unit === 'tonnes' ? t.volume_kg / 1000 : t.volume_kg} decimals={vol.unit === 'tonnes' ? 1 : 0} suffix={vol.unit} />
            : <Big to={t.sets} suffix="sets" />}
          <Sub>
            {t.volume_kg > 0 ? `Across ${t.sets.toLocaleString('en-IN')} sets and ${t.reps.toLocaleString('en-IN')} reps.` : `${t.reps.toLocaleString('en-IN')} reps in all.`}
            {t.cardio_minutes > 0 ? ` Plus ${t.cardio_minutes} minutes of cardio.` : ''}
          </Sub>
          {vs && t.volume_kg > 0 && <Pill>{vs}</Pill>}
        </>
      );
    }

    case 'top':
      return r.top_lift ? (
        <>
          <Kicker icon={<Trophy size={15} aria-hidden />}>Heaviest lift</Kicker>
          <Big to={r.top_lift.weight_kg} decimals={r.top_lift.weight_kg % 1 ? 1 : 0} suffix="kg" />
          <Sub>{r.top_lift.exercise}{r.top_lift.reps ? ` × ${r.top_lift.reps}` : ''}, on {new Date(r.top_lift.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.</Sub>
        </>
      ) : null;

    case 'records':
      return (
        <>
          <Kicker icon={<Trophy size={15} aria-hidden />}>Records broken</Kicker>
          <Big to={r.records.length} suffix={r.records.length === 1 ? 'personal best' : 'personal bests'} />
          <ul className="mt-6 space-y-2.5">
            {r.records.slice(0, 4).map((x, n) => (
              <m.li key={`${x.exercise}-${n}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + n * 0.1 }}
                className="flex items-center justify-between gap-4 rounded-[14px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <span className="truncate text-[16px] font-[750]">{x.exercise}</span>
                <span className="shrink-0 text-[16px] font-[800] tabular-nums">{kg(x.weight_kg)}{x.reps ? ` × ${x.reps}` : ''}</span>
              </m.li>
            ))}
          </ul>
        </>
      );

    case 'favourite':
      return r.favourite ? (
        <>
          <Kicker icon={<Dumbbell size={15} aria-hidden />}>Most trained</Kicker>
          <h2 className="text-[48px] font-[850] leading-[1] tracking-[-0.03em]">{r.favourite.exercise}</h2>
          <Sub>{r.favourite.sets} sets this month — more than any other exercise.</Sub>
        </>
      ) : null;

    case 'body': {
      const w = r.weight;
      if (!w || w.change_kg === null) return null;
      const c = w.change_kg;
      return (
        <>
          <Kicker icon={<Scale size={15} aria-hidden />}>Body weight</Kicker>
          <p className="text-[96px] font-[850] leading-[0.9] tracking-[-0.05em] tabular-nums">
            {c > 0 ? '+' : c < 0 ? '−' : ''}<CountUp to={Math.abs(c)} decimals={Math.abs(c) % 1 ? 1 : 0} />
            <span className="ml-2 text-[40px] font-[800]">kg</span>
          </p>
          <Sub>From {kg(w.start_kg)} to {kg(w.end_kg)} across {w.readings} weigh-ins.</Sub>
        </>
      );
    }

    case 'summary':
      return <Summary r={r} />;
  }
}

function Summary({ r }: { r: MeRecap }) {
  const [state, setState] = useState<'idle' | 'busy' | 'downloaded' | 'failed'>('idle');
  const stats = headlineStats(r);

  const share = async () => {
    setState('busy');
    const result = await shareRecapCard(r);
    setState(result === 'downloaded' ? 'downloaded' : result === 'failed' ? 'failed' : 'idle');
  };

  return (
    <div className="relative z-20">
      <Kicker icon={<Calendar size={15} aria-hidden />}>{monthName(r.month)} in numbers</Kicker>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, n) => (
          <m.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + n * 0.08 }}
            className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
            <p className="text-[40px] font-[850] leading-none tracking-[-0.03em] tabular-nums">{s.value}</p>
            <p className="mt-2 text-[11px] font-[750] uppercase tracking-[0.12em] opacity-75">{s.label}</p>
          </m.div>
        ))}
      </div>
      {r.studio_name && <p className="mt-5 text-[14px] font-[650] opacity-75">Trained at {r.studio_name}</p>}

      <button type="button" onClick={() => void share()} disabled={state === 'busy'}
        className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-[16px] text-[16px] font-[800] disabled:opacity-70"
        style={{ background: '#fff', color: palette.gray[900] }}>
        {state === 'busy' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Share2 size={18} aria-hidden />}
        Share my month
      </button>
      <p className="mt-3 min-h-[18px] text-center text-[12.5px] font-[600] opacity-80" role="status">
        {state === 'downloaded' ? 'Saved to your downloads — post it to your story.' : state === 'failed' ? 'Could not make the image on this phone.' : ''}
      </p>
    </div>
  );
}
