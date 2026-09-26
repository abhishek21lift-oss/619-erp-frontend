'use client';

/**
 * Guided workout — the member trains through today's workout one exercise at
 * a time, and it is logged as they go.
 *
 *   • each exercise: the trainer's prescription, what they did last time, a
 *     demo if the library has one, and set rows pre-filled from last time
 *   • ticking a set starts the rest timer (the plan's rest, else 90 s) and
 *     buzzes the phone when it is time to go again
 *   • a set heavier than their best ever gets its moment on the spot
 *   • Finish sends the whole workout once; the summary shows the personal
 *     bests the SERVER found (the on-the-spot badge is only a hint)
 *
 * The workout in progress is saved on the phone after every change (see
 * workoutDraft.ts), so closing the app, locking the screen or losing signal
 * never costs a set. Closing asks whether to keep it for later or discard it.
 *
 * Full screen, above the member shell: while training, nothing else on the
 * screen should compete with the next set.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import {
  Check, ChevronLeft, ChevronRight, Dumbbell, Flag, History, Loader2, Minus, Plus, Timer, Trophy, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { MeWorkoutSummary } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { palette, rgba } from '@/lib/palette';
import { EASE, MC } from './MemberUI';
import {
  DEFAULT_REST, beatsBest, clearDraft, exercisesDone, fmtKg, isLogged, loggedSetCount, num, saveDraft,
  toLogInput, volumeOf, type DraftExercise, type DraftSet, type WorkoutDraft,
} from './workoutDraft';

const GOOD = palette.emerald[500];

type Phase = 'train' | 'saving' | 'done';

export default function GuidedWorkout({
  initial,
  onClose,
  onSaved,
}: {
  initial: WorkoutDraft;
  /** The screen closed — the draft may still be saved on the phone. */
  onClose: () => void;
  /** The workout reached the server. */
  onSaved?: (summary: MeWorkoutSummary) => void;
}) {
  const [draft, setDraft] = useState<WorkoutDraft>(initial);
  const [phase, setPhase] = useState<Phase>('train');
  const [summary, setSummary] = useState<MeWorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const titleId = useId();

  // Every change is on the phone before the next tap.
  useEffect(() => { if (phase !== 'done') saveDraft(draft); }, [draft, phase]);

  const requestClose = useCallback(() => {
    if (phase === 'done') { onClose(); return; }
    if (loggedSetCount(draft) === 0) { clearDraft(); onClose(); return; }
    setConfirmClose(true);
  }, [draft, phase, onClose]);

  const shellRef = useDialogA11y({ open: true, onClose: confirmClose ? undefined : requestClose, escapeCloses: !confirmClose });

  // The screen sits over the page; stop the page scrolling underneath it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const ex = draft.exercises[draft.current];
  const isLast = draft.current === draft.exercises.length - 1;
  const logged = loggedSetCount(draft);

  const update = (fn: (d: WorkoutDraft) => WorkoutDraft) => setDraft((d) => fn(structuredClone(d)));

  const setField = (i: number, field: 'weight' | 'reps', value: string) =>
    update((d) => { d.exercises[d.current].sets[i][field] = value.replace(/[^\d.,]/g, '').slice(0, 6); return d; });

  const step = (i: number, field: 'weight' | 'reps', delta: number) => update((d) => {
    const s = d.exercises[d.current].sets[i];
    const next = Math.max(0, (num(s[field]) ?? 0) + delta);
    s[field] = field === 'weight' ? fmtKg(next) : String(Math.round(next));
    return d;
  });

  const toggleDone = (i: number) => {
    const s = ex.sets[i];
    const becomingDone = !s.done;
    if (becomingDone && (num(s.reps) ?? 0) <= 0) return;
    update((d) => { d.exercises[d.current].sets[i].done = becomingDone; return d; });
    if (!becomingDone) return;
    if (beatsBest(s, ex.best_kg)) {
      setFlash(`New best on ${ex.name}: ${fmtKg(num(s.weight))} kg`);
      buzz([60, 40, 60]);
    }
    const seconds = ex.rest_seconds && ex.rest_seconds > 0 ? ex.rest_seconds : DEFAULT_REST;
    const lastOfAll = isLast && ex.sets.every((x, j) => j === i || x.done);
    if (!lastOfAll) setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
  };

  const addSet = () => update((d) => {
    const sets = d.exercises[d.current].sets;
    const prev = sets[sets.length - 1];
    if (sets.length < 20) sets.push({ weight: prev?.weight ?? '', reps: prev?.reps ?? '', done: false });
    return d;
  });

  const removeSet = (i: number) => update((d) => {
    const sets = d.exercises[d.current].sets;
    if (sets.length > 1) sets.splice(i, 1);
    return d;
  });

  const go = (index: number) => {
    update((d) => { d.current = Math.max(0, Math.min(d.exercises.length - 1, index)); return d; });
    document.getElementById('gw-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = async () => {
    if (logged === 0) return;
    setRest(null);
    setError(null);
    setPhase('saving');
    try {
      const res = await api.me.logWorkout(toLogInput(draft));
      clearDraft();
      setSummary(res.data);
      setPhase('done');
      buzz([80, 60, 120]);
      onSaved?.(res.data);
    } catch (err) {
      setPhase('train');
      if (err instanceof ApiError && err.status === 403) {
        setError('Your health screening needs your trainer\'s clearance before you log workouts. Your workout is saved on this phone.');
      } else if (err instanceof ApiError && err.status === 429) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message || 'Something in this workout could not be saved.');
      } else {
        setError('Could not reach the studio. Your workout is saved on this phone — try again when you\'re back online.');
      }
    }
  };

  const elapsedFrom = useMemo(() => new Date(draft.started_at).getTime(), [draft.started_at]);

  return (
    <div data-no-pull-refresh className="fixed inset-0 z-[80] flex flex-col" style={{ background: 'var(--bg-canvas)' }}>
      <div ref={shellRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col">
        {phase === 'done' && summary ? (
          <Summary summary={summary} draft={draft} titleId={titleId} onDone={onClose} />
        ) : (
          <>
            <Header draft={draft} titleId={titleId} startedAt={elapsedFrom} onClose={requestClose} />

            <div id="gw-scroll" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
              <div className="mx-auto max-w-[560px]">
                <ExerciseTabs draft={draft} onPick={go} />
                <AnimatePresence mode="wait">
                  <m.div key={draft.current}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.28, ease: EASE }}>
                    <ExerciseCard ex={ex} />
                    <SetTable ex={ex} onField={setField} onStep={step} onToggle={toggleDone} onRemove={removeSet} />
                    <button type="button" onClick={addSet}
                      className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-[700]"
                      style={{ border: '1px dashed var(--border)', color: MC.muted }}>
                      <Plus size={15} aria-hidden /> Add a set
                    </button>
                  </m.div>
                </AnimatePresence>

                {error && (
                  <p role="alert" className="mt-4 rounded-[12px] px-4 py-3 text-[12.5px] font-[650] leading-relaxed"
                    style={{ background: rgba(MC.danger, 0.1), color: MC.danger }}>
                    {error}
                  </p>
                )}
              </div>
            </div>

            <Footer
              canBack={draft.current > 0}
              isLast={isLast}
              saving={phase === 'saving'}
              logged={logged}
              onBack={() => go(draft.current - 1)}
              onNext={() => go(draft.current + 1)}
              onFinish={() => void finish()}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {rest && phase === 'train' && (
          <RestTimer key="rest" rest={rest}
            onChange={(delta) => setRest((r) => (r ? { endsAt: Math.max(Date.now(), r.endsAt + delta * 1000), total: Math.max(15, r.total + delta) } : r))}
            onDone={() => setRest(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash && <PrFlash key={flash} text={flash} onGone={() => setFlash(null)} />}
      </AnimatePresence>

      {confirmClose && (
        <CloseSheet
          onKeep={() => { setConfirmClose(false); onClose(); }}
          onDiscard={() => { clearDraft(); setConfirmClose(false); onClose(); }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}

function buzz(pattern: number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* no vibration motor, or not allowed — the screen still shows it */ }
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header({ draft, titleId, startedAt, onClose }: {
  draft: WorkoutDraft; titleId: string; startedAt: number; onClose: () => void;
}) {
  const done = exercisesDone(draft);
  const pct = Math.round((done / draft.exercises.length) * 100);
  return (
    <header className="shrink-0 px-4 pt-[max(12px,env(safe-area-inset-top))]"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="mx-auto flex max-w-[560px] items-center gap-3 pb-3">
        <button type="button" onClick={onClose} aria-label="Close workout"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: 'var(--bg-subtle)', color: MC.ink }}>
          <X size={18} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-[15px] font-[800]" style={{ color: MC.ink }}>{draft.title}</h2>
          <p className="text-[11.5px] font-[650] tabular-nums" style={{ color: MC.muted }}>
            <Elapsed since={startedAt} /> · {done}/{draft.exercises.length} exercises
          </p>
        </div>
      </div>
      <div className="mx-auto h-1 max-w-[560px] overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
        role="progressbar" aria-label="Exercises done" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <m.div className="h-full rounded-full" style={{ background: MC.primary }}
          initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: EASE }} />
      </div>
    </header>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span aria-label="Time training">{h ? `${h}:` : ''}{mm}:{ss}</span>;
}

// ── Exercise navigation and card ────────────────────────────────────────────

function ExerciseTabs({ draft, onPick }: { draft: WorkoutDraft; onPick: (i: number) => void }) {
  const active = useRef<HTMLButtonElement | null>(null);
  const currentIndex = draft.current;
  useEffect(() => { active.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [currentIndex]);
  if (draft.exercises.length < 2) return null;
  return (
    <nav aria-label="Exercises" className="-mx-4 mb-3 overflow-x-auto px-4 [scrollbar-width:none]">
      <ol className="flex gap-1.5">
        {draft.exercises.map((x, i) => {
          const current = i === draft.current;
          const done = x.sets.some(isLogged);
          return (
            <li key={`${x.name}-${i}`}>
              <button type="button" ref={current ? active : undefined} onClick={() => onPick(i)}
                aria-current={current ? 'step' : undefined}
                className="flex h-8 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[12px] font-[700] transition-colors"
                style={current
                  ? { background: MC.primary, color: '#fff' }
                  : done
                    ? { background: rgba(GOOD, 0.12), color: GOOD }
                    : { background: 'var(--bg-subtle)', color: MC.muted }}>
                {done && !current && <Check size={12} aria-label="done" />}
                {i + 1}. {x.name.length > 18 ? `${x.name.slice(0, 17)}…` : x.name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ExerciseCard({ ex }: { ex: DraftExercise }) {
  return (
    <section className="mb-3 overflow-hidden rounded-[18px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {ex.media_url && (
        <div className="flex max-h-[220px] items-center justify-center overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- library GIFs/images from arbitrary hosts */}
          <img src={ex.media_url} alt={`How to do ${ex.name}`} loading="lazy" className="max-h-[220px] w-auto object-contain" />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-[20px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>{ex.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ex.prescription && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
              style={{ background: rgba(MC.primary, 0.12), color: MC.primary }}>
              <Dumbbell size={12} aria-hidden /> {ex.prescription}
            </span>
          )}
          {ex.rest_seconds ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
              style={{ background: 'var(--bg-subtle)', color: MC.muted }}>
              <Timer size={12} aria-hidden /> Rest {ex.rest_seconds}s
            </span>
          ) : null}
          {ex.best_kg !== null && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
              style={{ background: rgba(GOOD, 0.1), color: GOOD }}>
              <Trophy size={12} aria-hidden /> Best {fmtKg(ex.best_kg)} kg
            </span>
          )}
        </div>
        {ex.last_summary && (
          <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
            <History size={13} className="mt-[3px] shrink-0" aria-hidden />
            <span><span className="font-[700]" style={{ color: MC.ink }}>Last time</span>{ex.last_date ? ` (${shortDate(ex.last_date)})` : ''}: {ex.last_summary}</span>
          </p>
        )}
        {ex.notes && <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{ex.notes}</p>}
        {ex.video_url && (
          <a href={ex.video_url} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block text-[12.5px] font-[750]" style={{ color: MC.primary }}>
            Watch how →
          </a>
        )}
      </div>
    </section>
  );
}

function shortDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Sets ─────────────────────────────────────────────────────────────────────

function SetTable({ ex, onField, onStep, onToggle, onRemove }: {
  ex: DraftExercise;
  onField: (i: number, field: 'weight' | 'reps', value: string) => void;
  onStep: (i: number, field: 'weight' | 'reps', delta: number) => void;
  onToggle: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[28px_1fr_1fr_48px] items-center gap-2 px-1 text-[10px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
        <span>Set</span><span className="text-center">kg</span><span className="text-center">Reps</span><span className="sr-only">Done</span>
      </div>
      {ex.sets.map((s, i) => (
        <SetRow key={i} n={i + 1} s={s} best={ex.best_kg} canRemove={ex.sets.length > 1}
          onField={(f, v) => onField(i, f, v)} onStep={(f, d) => onStep(i, f, d)}
          onToggle={() => onToggle(i)} onRemove={() => onRemove(i)} />
      ))}
    </div>
  );
}

function SetRow({ n, s, best, canRemove, onField, onStep, onToggle, onRemove }: {
  n: number; s: DraftSet; best: number | null; canRemove: boolean;
  onField: (f: 'weight' | 'reps', v: string) => void;
  onStep: (f: 'weight' | 'reps', d: number) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const ready = (num(s.reps) ?? 0) > 0;
  const pr = s.done && beatsBest(s, best);
  return (
    <m.div layout className="grid grid-cols-[28px_1fr_1fr_48px] items-center gap-2 rounded-[14px] p-1.5"
      style={{
        background: s.done ? rgba(GOOD, 0.08) : 'var(--bg-card)',
        border: `1px solid ${s.done ? rgba(GOOD, 0.35) : 'var(--border)'}`,
      }}>
      <button type="button" onClick={canRemove && !s.done ? onRemove : undefined} disabled={!canRemove || s.done}
        aria-label={canRemove && !s.done ? `Remove set ${n}` : `Set ${n}`}
        className="grid h-9 w-7 place-items-center text-[13px] font-[800] tabular-nums" style={{ color: pr ? GOOD : MC.muted }}>
        {pr ? <Trophy size={14} aria-label="New best" /> : n}
      </button>
      <Stepper label={`Set ${n} weight, kg`} value={s.weight} inputMode="decimal" disabled={s.done}
        onChange={(v) => onField('weight', v)} onMinus={() => onStep('weight', -2.5)} onPlus={() => onStep('weight', 2.5)} />
      <Stepper label={`Set ${n} reps`} value={s.reps} inputMode="numeric" disabled={s.done}
        onChange={(v) => onField('reps', v)} onMinus={() => onStep('reps', -1)} onPlus={() => onStep('reps', 1)} />
      <m.button type="button" onClick={onToggle} disabled={!ready && !s.done} whileTap={{ scale: 0.9 }}
        aria-pressed={s.done} aria-label={s.done ? `Set ${n} done — tap to undo` : `Mark set ${n} done`}
        className="grid h-11 w-12 place-items-center rounded-[12px] transition-colors disabled:opacity-40"
        style={s.done ? { background: GOOD, color: '#fff' } : { background: 'var(--bg-subtle)', color: MC.muted }}>
        <Check size={20} strokeWidth={3} aria-hidden />
      </m.button>
    </m.div>
  );
}

function Stepper({ label, value, inputMode, disabled, onChange, onMinus, onPlus }: {
  label: string; value: string; inputMode: 'decimal' | 'numeric'; disabled: boolean;
  onChange: (v: string) => void; onMinus: () => void; onPlus: () => void;
}) {
  return (
    <div className="flex h-11 items-center overflow-hidden rounded-[12px]" style={{ background: 'var(--bg-subtle)' }}>
      <button type="button" onClick={onMinus} disabled={disabled} aria-label={`${label}: less`}
        className="grid h-full w-8 shrink-0 place-items-center disabled:opacity-30" style={{ color: MC.muted }}>
        <Minus size={14} aria-hidden />
      </button>
      <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        inputMode={inputMode} enterKeyHint="done" aria-label={label} placeholder="–"
        className="h-full w-full min-w-0 bg-transparent text-center text-[16px] font-[800] tabular-nums outline-none disabled:opacity-100"
        style={{ color: MC.ink }} />
      <button type="button" onClick={onPlus} disabled={disabled} aria-label={`${label}: more`}
        className="grid h-full w-8 shrink-0 place-items-center disabled:opacity-30" style={{ color: MC.muted }}>
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer({ canBack, isLast, saving, logged, onBack, onNext, onFinish }: {
  canBack: boolean; isLast: boolean; saving: boolean; logged: number;
  onBack: () => void; onNext: () => void; onFinish: () => void;
}) {
  return (
    <footer className="shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="mx-auto flex max-w-[560px] gap-2">
        <button type="button" onClick={onBack} disabled={!canBack} aria-label="Previous exercise"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] disabled:opacity-30"
          style={{ background: 'var(--bg-subtle)', color: MC.ink }}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        {isLast ? (
          <button type="button" onClick={onFinish} disabled={saving || logged === 0}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white disabled:opacity-50"
            style={{ background: GOOD }}>
            {saving ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Saving…</> : <><Flag size={16} aria-hidden /> Finish workout</>}
          </button>
        ) : (
          <>
            <button type="button" onClick={onNext}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[13px] text-[14px] font-[780] text-white"
              style={{ background: MC.primary }}>
              Next exercise <ChevronRight size={18} aria-hidden />
            </button>
            {logged > 0 && (
              <button type="button" onClick={onFinish} disabled={saving} aria-label="Finish workout now"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] disabled:opacity-50"
                style={{ background: rgba(GOOD, 0.12), color: GOOD }}>
                {saving ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Flag size={18} aria-hidden />}
              </button>
            )}
          </>
        )}
      </div>
    </footer>
  );
}

// ── Rest timer ───────────────────────────────────────────────────────────────

function RestTimer({ rest, onChange, onDone }: {
  rest: { endsAt: number; total: number };
  onChange: (deltaSeconds: number) => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (left > 0) { fired.current = false; return; }
    if (fired.current) return;
    fired.current = true;
    buzz([200, 100, 200]);
    const t = window.setTimeout(onDone, 1200);
    return () => window.clearTimeout(t);
  }, [left, onDone]);

  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = rest.total > 0 ? left / rest.total : 0;

  return (
    <m.div role="status" aria-live="polite"
      initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="pointer-events-auto fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[81] mx-auto flex max-w-[536px] items-center gap-4 rounded-[20px] p-3 pr-4 shadow-2xl"
      style={{ background: palette.gray[900], color: '#fff' }}>
      <div className="relative grid h-[80px] w-[80px] shrink-0 place-items-center">
        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={left === 0 ? GOOD : palette.blue[400]} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
        </svg>
        <span className="text-[20px] font-[820] tabular-nums">
          {left === 0 ? 'Go' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-[780]">{left === 0 ? 'Next set' : 'Rest'}</p>
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => onChange(-15)} className="h-9 rounded-full px-3 text-[12px] font-[750]"
            style={{ background: 'rgba(255,255,255,0.12)' }}>−15s</button>
          <button type="button" onClick={() => onChange(15)} className="h-9 rounded-full px-3 text-[12px] font-[750]"
            style={{ background: 'rgba(255,255,255,0.12)' }}>+15s</button>
          <button type="button" onClick={onDone} className="h-9 rounded-full px-3 text-[12px] font-[750]"
            style={{ background: '#fff', color: palette.gray[900] }}>Skip</button>
        </div>
      </div>
    </m.div>
  );
}

// ── Moments ──────────────────────────────────────────────────────────────────

function PrFlash({ text, onGone }: { text: string; onGone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onGone, 2600);
    return () => window.clearTimeout(t);
  }, [onGone]);
  return (
    <m.div role="status" aria-live="assertive"
      initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -30, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="fixed inset-x-4 top-[max(16px,env(safe-area-inset-top))] z-[82] mx-auto flex max-w-[420px] items-center gap-3 rounded-[16px] px-4 py-3 text-white shadow-2xl"
      style={{ background: GOOD }}>
      <Trophy size={20} aria-hidden />
      <span className="text-[13.5px] font-[780]">{text}</span>
    </m.div>
  );
}

function CloseSheet({ onKeep, onDiscard, onCancel }: { onKeep: () => void; onDiscard: () => void; onCancel: () => void }) {
  const ref = useDialogA11y({ open: true, onClose: onCancel });
  const id = useId();
  return (
    <div data-no-pull-refresh className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCancel} aria-hidden />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
        className="relative m-3 w-full max-w-[420px] rounded-[20px] p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--bg-card)' }}>
        <h3 id={id} className="text-[16px] font-[800]" style={{ color: MC.ink }}>Leave this workout?</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
          Keep it and carry on later from the Workout tab, or discard what you have logged.
        </p>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={onKeep}
            className="h-12 w-full rounded-[13px] text-[14px] font-[750] text-white" style={{ background: MC.primary }}>
            Keep for later
          </button>
          <button type="button" onClick={onDiscard}
            className="h-12 w-full rounded-[13px] text-[14px] font-[750]" style={{ background: rgba(MC.danger, 0.1), color: MC.danger }}>
            Discard workout
          </button>
          <button type="button" onClick={onCancel}
            className="h-11 w-full rounded-[13px] text-[13.5px] font-[700]" style={{ color: MC.muted }}>
            Keep training
          </button>
        </div>
      </m.div>
    </div>
  );
}

// ── Finish ───────────────────────────────────────────────────────────────────

function Summary({ summary, draft, titleId, onDone }: {
  summary: MeWorkoutSummary; draft: WorkoutDraft; titleId: string; onDone: () => void;
}) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(draft.started_at).getTime()) / 60_000));
  const volume = summary.volume_kg || volumeOf(draft);
  const stats = [
    { label: minutes === 1 ? 'Minute' : 'Minutes', value: String(minutes) },
    { label: 'Sets', value: String(summary.sets) },
    { label: 'Volume', value: volume >= 1000 ? `${(volume / 1000).toFixed(1)} t` : `${volume} kg` },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col">
        <div className="relative mx-auto mb-5 grid h-24 w-24 place-items-center">
          <Burst />
          <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="grid h-24 w-24 place-items-center rounded-full text-white" style={{ background: GOOD }}>
            <Check size={44} strokeWidth={3} aria-hidden />
          </m.span>
        </div>
        <m.h2 id={titleId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease: EASE }}
          className="text-center text-[28px] font-[850] tracking-[-0.03em]" style={{ color: MC.ink }}>
          Workout done
        </m.h2>
        <p className="mt-1 text-center text-[13px]" style={{ color: MC.muted }}>
          Saved, and your trainer can see it.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {stats.map((s, i) => (
            <m.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.07, ease: EASE }}
              className="rounded-[16px] p-3 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[22px] font-[850] tabular-nums tracking-[-0.02em]" style={{ color: MC.ink }}>{s.value}</p>
              <p className="text-[10px] font-[750] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>{s.label}</p>
            </m.div>
          ))}
        </div>

        {summary.prs.length > 0 && (
          <m.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, ease: EASE }}
            className="mt-5 rounded-[18px] p-4" style={{ background: rgba(GOOD, 0.08), border: `1px solid ${rgba(GOOD, 0.3)}` }}>
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-[800]" style={{ color: GOOD }}>
              <Trophy size={16} aria-hidden /> {summary.prs.length === 1 ? 'Personal best' : `${summary.prs.length} personal bests`}
            </h3>
            <ul className="space-y-1.5">
              {summary.prs.slice(0, 6).map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="truncate font-[700]" style={{ color: MC.ink }}>{p.exercise}</span>
                  <span className="shrink-0 font-[750] tabular-nums" style={{ color: MC.ink }}>
                    {p.weight_kg !== null ? `${fmtKg(p.weight_kg)} kg` : ''}{p.reps !== null ? ` × ${p.reps}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </m.section>
        )}

        <div className="flex-1" />
        <button type="button" onClick={onDone}
          className="mt-6 h-12 w-full rounded-[13px] text-[14px] font-[780] text-white" style={{ background: MC.primary }}>
          Done
        </button>
      </div>
    </div>
  );
}

/** A ring of dots flying outward — the finish moment, drawn with transforms only. */
function Burst() {
  const dots = Array.from({ length: 14 }, (_, i) => i);
  const colors = [palette.emerald[400], palette.blue[400], palette.emerald[500], palette.blue[500]];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((i) => {
        const a = (i / dots.length) * Math.PI * 2;
        return (
          <m.span key={i} className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ background: colors[i % colors.length], marginLeft: -4, marginTop: -4 }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: Math.cos(a) * 78, y: Math.sin(a) * 78, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
            transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }} />
        );
      })}
    </div>
  );
}
