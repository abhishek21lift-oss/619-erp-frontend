'use client';

// Macrocycle planner.
//
// Splits a training block into phases and creates one programme per phase
// through the normal plan endpoint. A phase IS a plan whose duration is the
// phase's weeks, so the builder and the assignment flow need no new concepts —
// the trainer writes each phase exactly like a hand-built programme.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { CalendarRange, Loader2, Plus } from 'lucide-react';
import {
  MACRO_GOALS, buildMacroCycle, macroPhasePlans, microCycleDays, type MacroGoal,
} from '@/lib/macro-programming';

const field = 'w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none focus:border-[#0271EB]';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? Math.trunc(n) : min));
}

function weeksLabel(weeks: number[]): string {
  return weeks.length === 1
    ? `Week ${weeks[0]}`
    : `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
}

export default function MacrocyclePage() {
  const { toast } = useToast();
  const [goal, setGoal] = useState<MacroGoal>('general_fitness');
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [includeDeload, setIncludeDeload] = useState(true);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    key: string;
    plans: Array<{ id: string; name: string }>;
  } | null>(null);

  const input = useMemo(
    () => ({ goal, totalWeeks, daysPerWeek, includeDeload }),
    [goal, totalWeeks, daysPerWeek, includeDeload],
  );
  const cycle = useMemo(() => buildMacroCycle(input), [input]);
  const payloads = useMemo(() => macroPhasePlans(input), [input]);
  const days = useMemo(() => microCycleDays(daysPerWeek), [daysPerWeek]);

  // The result is tied to the inputs that produced it. Without this, pressing
  // the button twice files two identical sets of programmes, and the second set
  // is invisible until somebody opens the workout list.
  const key = `${goal}|${totalWeeks}|${daysPerWeek}|${includeDeload ? 1 : 0}`;
  const made = created?.key === key ? created.plans : null;

  const create = async () => {
    setBusy(true);
    try {
      const plans: Array<{ id: string; name: string }> = [];
      for (const payload of payloads) {
        const res = await api.workouts.plans.create(payload);
        plans.push({ id: res.plan.id, name: res.plan.name });
      }
      setCreated({ key, plans });
      toast.success(`${plans.length} programme${plans.length === 1 ? '' : 's'} created`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the programmes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Guard role="trainer">
      <PageContainer>
        <PageHero
          icon={<CalendarRange size={20} color="#fff" />}
          title="Macrocycle"
          subtitle="Split a training block into phases, then write each phase in the builder."
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px]">
            Goal
            <select
              aria-label="Goal"
              className={field}
              value={goal}
              onChange={(e) => setGoal(e.target.value as MacroGoal)}
            >
              {MACRO_GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          <label className="text-[12px]">
            Total weeks
            <input
              aria-label="Total weeks"
              type="number"
              min={4}
              max={52}
              className={field}
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(clamp(Number(e.target.value), 4, 52))}
            />
          </label>
          <label className="text-[12px]">
            Days per week
            <input
              aria-label="Days per week"
              type="number"
              min={1}
              max={7}
              className={field}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(clamp(Number(e.target.value), 1, 7))}
            />
          </label>
          <label className="flex h-[44px] items-center gap-2 self-end text-[12px]">
            <input
              type="checkbox"
              checked={includeDeload}
              onChange={(e) => setIncludeDeload(e.target.checked)}
            />
            Include deload
          </label>
        </div>

        <section className="mb-5">
          <h2 className="mb-1 text-[15px] font-[700]">
            {totalWeeks}-week block · {cycle.phases.length} phase{cycle.phases.length === 1 ? '' : 's'}
          </h2>
          <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {daysPerWeek} day{daysPerWeek === 1 ? '' : 's'}/week: {days.join(' · ')}
          </p>
          <div className="space-y-3">
            {cycle.phases.map((phase) => (
              <div
                key={phase.name}
                className="rounded-[12px] border p-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[14px] font-[600]">{phase.name}</h3>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {weeksLabel(phase.weeks)} · {phase.weeks.length} week{phase.weeks.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{phase.focus}</p>
              </div>
            ))}
          </div>
        </section>

        {made ? (
          <section className="rounded-[12px] border p-3" style={{ borderColor: 'var(--border)' }}>
            <h2 className="mb-2 text-[13px] font-[700]">Programmes created</h2>
            <ul className="space-y-2">
              {made.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={`/pt-os/workout-plans/${plan.id}/builder`}
                    className="text-[13px] font-[600]"
                    style={{ color: 'var(--brand)' }}
                  >
                    {plan.name} — open builder
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Button onClick={create} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create {payloads.length} programme{payloads.length === 1 ? '' : 's'}
          </Button>
        )}
      </PageContainer>
    </Guard>
  );
}
