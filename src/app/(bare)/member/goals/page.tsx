'use client';
/**
 * Member — Goals.
 *
 * Targets the member sets for themselves (a lift, a body weight, a number of
 * sessions) and the trainer's weight target beside them. Where they are now,
 * how far they have come and when they will get there are all computed by
 * the server from what was logged (GET /api/me/goals) — this page draws it.
 *
 * A projected date is shown only when the server could fit one to the
 * member's own readings; otherwise the card says what it is waiting for.
 * A goal reached for the first time gets its moment, once.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import {
  CalendarCheck, Dumbbell, Flag, Loader2, Plus, Scale, Target, Trash2, TrendingDown, TrendingUp, Trophy, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EASE, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import {
  ChoiceChips, DateFieldControl, FormErrorBanner, NumberField, SelectField, TextField,
} from '@/components/ui/form';
import { api } from '@/lib/api';
import type { MeGoal, MeGoalKind, MeGoals } from '@/lib/api';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  GOAL_KINDS, blankMemberGoal, memberGoalSchema, toMemberGoalPayload,
} from '@/lib/forms/schemas/memberGoal';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { palette, rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

const GOOD = palette.emerald[500];

export default function MemberGoalsPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <GoalsBody />
      </MemberShell>
    </Guard>
  );
}

const KIND_META: Record<MeGoalKind, { label: string; icon: typeof Target; unit: string }> = {
  lift: { label: 'Lift', icon: Dumbbell, unit: 'kg' },
  weight: { label: 'Body weight', icon: Scale, unit: 'kg' },
  sessions: { label: 'Sessions', icon: CalendarCheck, unit: 'sessions' },
};

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));

function titleOf(g: MeGoal): string {
  if (g.kind === 'lift') return `${g.exercise_name} ${fmt(g.target_value)} kg`;
  if (g.kind === 'weight') return `Reach ${fmt(g.target_value)} kg`;
  return `${fmt(g.target_value)} sessions`;
}

function GoalsBody() {
  const [data, setData] = useState<MeGoals | null>(null);
  const [failed, setFailed] = useState(false);
  const [exercises, setExercises] = useState<string[]>([]);
  const [adding, setAdding] = useState<MeGoalKind | null>(null);
  const [celebrate, setCelebrate] = useState<MeGoal | null>(null);

  const load = () => api.me.goals()
    .then((r) => {
      setData(r.data);
      const fresh = r.data.goals.find((g) => g.just_achieved);
      if (fresh) setCelebrate(fresh);
    })
    .catch(() => setFailed(true));

  useEffect(() => {
    void load();
    // Exercises they have actually lifted — the ones a lift goal can track.
    api.me.achievements()
      .then((r) => setExercises([...new Set(r.data.records.map((x) => x.exercise))].sort((a, b) => a.localeCompare(b))))
      .catch(() => setExercises([]));
  }, []);

  const title = (
    <PageTitle icon={<Target size={20} />} title="Goals" sub="Tracked from your workouts and weigh-ins" />
  );
  if (failed) return <>{title}<LoadError what="goals" /></>;
  if (!data) return <PageSkeleton />;

  const active = data.goals.filter((g) => !g.reached);
  const reached = data.goals.filter((g) => g.reached);

  return (
    <>
      {title}

      {data.studio && (
        <Section title="Studio goal" aside={<span className="text-[10.5px] font-[600]" style={{ color: MC.muted }}>Set by your trainer</span>}>
          <GoalCard goal={data.studio} studio />
        </Section>
      )}

      <Section title="Your goals" aside={active.length > 0 && active.length < 5 ? (
        <button type="button" onClick={() => setAdding('lift')}
          className="inline-flex items-center gap-1 text-[12px] font-[750]" style={{ color: MC.primary }}>
          <Plus size={13} aria-hidden /> New goal
        </button>
      ) : null}>
        {active.length === 0 ? (
          <StarterCard onPick={setAdding} />
        ) : (
          <div className="space-y-2.5">
            {active.map((g, i) => (
              <m.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: EASE }}>
                <GoalCard goal={g} onRemoved={load} />
              </m.div>
            ))}
          </div>
        )}
      </Section>

      {reached.length > 0 && (
        <Section title="Reached">
          <div className="space-y-2.5">
            {reached.map((g) => <GoalCard key={g.id} goal={g} onRemoved={load} />)}
          </div>
        </Section>
      )}

      {adding && (
        <NewGoalSheet initialKind={adding} exercises={exercises}
          onClose={() => setAdding(null)} onCreated={() => { setAdding(null); void load(); }} />
      )}

      <AnimatePresence>
        {celebrate && <Celebration key={celebrate.id} goal={celebrate} onClose={() => setCelebrate(null)} />}
      </AnimatePresence>
    </>
  );
}

// ── A goal ───────────────────────────────────────────────────────────────────

function GoalCard({ goal, studio = false, onRemoved }: { goal: MeGoal & { label?: string | null }; studio?: boolean; onRemoved?: () => void }) {
  const meta = KIND_META[goal.kind];
  const Icon = meta.icon;
  const pct = goal.progress_pct ?? 0;
  const tone = goal.reached ? GOOD : MC.primary;
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const remove = async () => {
    setRemoving(true);
    try {
      await api.me.deleteGoal(goal.id);
      onRemoved?.();
    } catch {
      toast.error('Could not remove this goal. Try again.');
      setRemoving(false);
    }
  };

  const unit = meta.unit === 'sessions' ? '' : ` ${meta.unit}`;
  const heading = studio && goal.label ? `${sentence(goal.label)} · ${fmt(goal.target_value)} kg` : titleOf(goal);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
          style={{ background: rgba(tone, 0.12), color: tone }}>
          {goal.reached ? <Trophy size={18} aria-hidden /> : <Icon size={18} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-[800] leading-snug" style={{ color: MC.ink }}>{heading}</p>
          <p className="mt-0.5 text-[12px] font-[600] tabular-nums" style={{ color: MC.muted }}>
            {goal.kind === 'sessions'
              ? `${fmt(goal.current_value)} of ${fmt(goal.target_value)} done`
              : `Start ${fmt(goal.start_value)}${unit} · now ${fmt(goal.current_value)}${unit}`}
            {goal.target_date && !goal.reached ? ` · by ${longDate(goal.target_date)}` : ''}
          </p>
        </div>
        {!studio && onRemoved && (
          <button type="button" onClick={() => void remove()} disabled={removing} aria-label={`Remove goal: ${heading}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ color: MC.muted }}>
            {removing ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
          role="progressbar" aria-label={`${heading} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <m.div className="h-full rounded-full" style={{ background: goal.reached ? GOOD : `linear-gradient(90deg, ${MC.primary}, ${palette.blue[400]})` }}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} />
        </div>
        <span className="w-10 text-right text-[13px] font-[800] tabular-nums" style={{ color: MC.ink }}>
          {goal.progress_pct === null ? '—' : `${pct}%`}
        </span>
      </div>

      <Outlook goal={goal} />
    </Card>
  );
}

function sentence(v: string): string {
  const t = v.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** One line on where this is heading — a date, or what it is waiting for. */
function Outlook({ goal }: { goal: MeGoal }) {
  if (goal.reached) {
    return (
      <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-[700]" style={{ color: GOOD }}>
        <Flag size={13} aria-hidden /> Reached{goal.achieved_at ? ` ${longDate(goal.achieved_at)}` : ''}
      </p>
    );
  }
  const p = goal.projection;
  if (!p) return null;
  const pace = p.per_week !== undefined && p.per_week !== 0
    ? goal.kind === 'sessions'
      ? `${fmt(p.per_week)} a week`
      : `${p.per_week > 0 ? '+' : '−'}${fmt(Math.abs(p.per_week))} kg a week`
    : null;

  let text: string;
  let color = MC.muted;
  let icon = <TrendingUp size={13} aria-hidden />;
  if (p.eta) {
    text = `At your pace: around ${longDate(p.eta)}`;
    if (goal.status === 'on_track') { text += ' — on track'; color = GOOD; }
    if (goal.status === 'behind') { text += ' — after your date'; }
    if (goal.kind === 'weight' && (p.per_week ?? 0) < 0) icon = <TrendingDown size={13} aria-hidden />;
  } else if (p.reason === 'more_data') {
    text = goal.kind === 'weight'
      ? `${p.needed ?? 1} more weigh-in${(p.needed ?? 1) === 1 ? '' : 's'} and we can project a date`
      : `Log this lift ${p.needed ?? 1} more time${(p.needed ?? 1) === 1 ? '' : 's'} to see a projected date`;
  } else if (p.reason === 'more_time') {
    text = 'Keep going — a projected date appears after a couple of weeks';
  } else if (p.reason === 'off_trend') {
    text = goal.kind === 'sessions' ? 'No sessions since you set this yet' : `Trending the other way${pace ? ` (${pace})` : ''}`;
  } else {
    text = 'At this pace it is a long way off — a small push changes that';
  }

  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-[650]" style={{ color }}>
      {icon} <span>{text}{p.eta && pace ? ` · ${pace}` : ''}</span>
    </p>
  );
}

function StarterCard({ onPick }: { onPick: (k: MeGoalKind) => void }) {
  const ideas: { kind: MeGoalKind; title: string; body: string }[] = [
    { kind: 'lift', title: 'Lift heavier', body: 'Pick a lift and a number to hit.' },
    { kind: 'sessions', title: 'Show up', body: 'A number of sessions to complete.' },
    { kind: 'weight', title: 'Reach a weight', body: 'Tracked from your weigh-ins.' },
  ];
  return (
    <Card className="p-4">
      <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>Set your first goal</p>
      <p className="mt-0.5 text-[12.5px]" style={{ color: MC.muted }}>
        Progress fills in by itself from what you log — no extra tracking.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {ideas.map(({ kind, title, body }) => {
          const Icon = KIND_META[kind].icon;
          return (
            <button key={kind} type="button" onClick={() => onPick(kind)}
              className="flex items-center gap-3 rounded-[14px] p-3 text-left transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ border: '1px solid var(--border)' }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]" style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
                <Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-[750]" style={{ color: MC.ink }}>{title}</span>
                <span className="block text-[11.5px]" style={{ color: MC.muted }}>{body}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ── New goal ─────────────────────────────────────────────────────────────────

function NewGoalSheet({ initialKind, exercises, onClose, onCreated }: {
  initialKind: MeGoalKind; exercises: string[]; onClose: () => void; onCreated: () => void;
}) {
  const ref = useDialogA11y({ open: true, onClose });
  const { toast } = useToast();
  const schema = useMemo(() => memberGoalSchema(), []);
  const f = useAppForm({
    schema,
    defaultValues: blankMemberGoal(initialKind, exercises[0] ?? ''),
    onSubmit: async (values) => { await api.me.createGoal(toMemberGoalPayload(values)); },
    onSuccess: () => { toast.success('Goal set — it updates as you train'); onCreated(); },
  });
  const { form, isSubmitting } = f;
  const [kind, setKind] = useState<string>(initialKind);

  const targetHint = kind === 'lift' ? 'The weight you want to lift' : kind === 'weight' ? 'Your target body weight' : 'Sessions to complete from today';

  return (
    <div data-no-pull-refresh className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} aria-hidden />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="new-goal-title"
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.32, ease: EASE }}
        className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:m-4 sm:rounded-[24px]"
        style={{ background: 'var(--bg-canvas)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-goal-title" className="text-[18px] font-[820]" style={{ color: MC.ink }}>New goal</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: 'var(--bg-subtle)', color: MC.ink }}>
            <X size={16} aria-hidden />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="space-y-4">
          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

          <form.Field name="kind" listeners={{ onChange: ({ value }: { value: string }) => setKind(value) }}>
            {(field) => (
              <ChoiceChips field={field} legend="What kind of goal?" density="compact"
                options={GOAL_KINDS.map((k) => ({ value: k, label: KIND_META[k].label }))}
                serverError={f.errors.fieldErrors.kind} />
            )}
          </form.Field>

          {kind === 'lift' && (
            <form.Field name="exercise">
              {(field) => (exercises.length > 0 ? (
                <SelectField field={field} label="Exercise" placeholderOption="Choose a lift"
                  options={exercises.map((x) => ({ value: x, label: x }))}
                  serverError={f.errors.fieldErrors.exercise} />
              ) : (
                <TextField field={field} label="Exercise" placeholder="e.g. Back squat" maxLength={120}
                  description="Use the name your trainer logs it under, so your sets count toward it."
                  serverError={f.errors.fieldErrors.exercise} />
              ))}
            </form.Field>
          )}

          <form.Field name="target">
            {(field) => (
              <NumberField field={field} label="Target" description={targetHint}
                mode={kind === 'sessions' ? 'integer' : 'decimal'} suffix={kind === 'sessions' ? 'sessions' : 'kg'}
                placeholder={kind === 'sessions' ? 'e.g. 20' : kind === 'lift' ? 'e.g. 100' : 'e.g. 72'}
                serverError={f.errors.fieldErrors.target} />
            )}
          </form.Field>

          <form.Field name="targetDate">
            {(field) => (
              <DateFieldControl field={field} label="By when? (optional)"
                description="We'll tell you if you're on pace for it."
                serverError={f.errors.fieldErrors.targetDate} />
            )}
          </form.Field>

          <button type="submit" disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white disabled:opacity-60"
            style={{ background: MC.primary }}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" aria-hidden /> Saving…</> : <><Target size={16} aria-hidden /> Set goal</>}
          </button>
        </form>
      </m.div>
    </div>
  );
}

// ── Goal reached ─────────────────────────────────────────────────────────────

function Celebration({ goal, onClose }: { goal: MeGoal; onClose: () => void }) {
  const ref = useDialogA11y({ open: true, onClose });
  return (
    <m.div data-no-pull-refresh className="fixed inset-0 z-[75] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.72)' }} onClick={onClose} aria-hidden />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="goal-reached-title"
        initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-[360px] rounded-[26px] p-6 text-center" style={{ background: 'var(--bg-canvas)' }}>
        <m.span initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full text-white" style={{ background: GOOD, boxShadow: `0 16px 40px -12px ${rgba(GOOD, 0.7)}` }}>
          <Trophy size={36} aria-hidden />
        </m.span>
        <h2 id="goal-reached-title" className="mt-4 text-[24px] font-[850] tracking-[-0.02em]" style={{ color: MC.ink }}>Goal reached</h2>
        <p className="mt-1 text-[14px] font-[700]" style={{ color: MC.ink }}>{titleOf(goal)}</p>
        <p className="mt-1 text-[12.5px]" style={{ color: MC.muted }}>Your trainer has been told. Time to set the next one?</p>
        <button type="button" onClick={onClose}
          className="mt-5 h-12 w-full rounded-[13px] text-[14px] font-[780] text-white" style={{ background: MC.primary }}>
          Nice
        </button>
      </m.div>
    </m.div>
  );
}
