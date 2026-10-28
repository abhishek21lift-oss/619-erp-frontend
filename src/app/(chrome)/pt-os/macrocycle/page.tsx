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
import { Button, PageContainer, PageHero, FormField, TextInput, SelectInput } from '@/components/ui';
import { CheckboxField, type FieldLike } from '@/components/ui/form';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { CalendarRange, Loader2, Plus } from 'lucide-react';
import {
  MACRO_GOALS, buildMacroCycle, macroPhasePlans, microCycleDays, type MacroGoal,
} from '@/lib/macro-programming';

/** Text → an integer inside the range, falling back only when the text is not a number. */
function boundedInteger(text: string, min: number, max: number, fallback: number): number {
  const n = Number(text);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function weeksLabel(weeks: number[]): string {
  return weeks.length === 1
    ? `Week ${weeks[0]}`
    : `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
}

export default function MacrocyclePage() {
  const { toast } = useToast();
  const [goal, setGoal] = useState<MacroGoal>('general_fitness');
  const [totalWeeksText, setTotalWeeksText] = useState('12');
  const [daysPerWeekText, setDaysPerWeekText] = useState('3');
  const [includeDeload, setIncludeDeload] = useState(true);
  const totalWeeks = boundedInteger(totalWeeksText, 4, 52, 12);
  const daysPerWeek = boundedInteger(daysPerWeekText, 1, 7, 3);
  const deloadField: FieldLike<boolean> = {
    name: 'includeDeload',
    state: { value: includeDeload, meta: { errors: [], isTouched: false } },
    handleChange: setIncludeDeload,
    handleBlur: () => {},
  };
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<{ key: string; message: string } | null>(null);
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
    setCreateError(null);
    // Each phase is a separate POST. Recording them as they land means a
    // failure on phase 3 shows the two programmes that DO exist instead of
    // hiding them — and the retry prompt is honest about what is left.
    const plans: Array<{ id: string; name: string }> = [];
    try {
      for (const payload of payloads) {
        const res = await api.workouts.plans.create(payload);
        plans.push({ id: res.plan.id, name: res.plan.name });
        setCreated({ key, plans: [...plans] });
      }
      toast.success(`${plans.length} programme${plans.length === 1 ? '' : 's'} created`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create the programmes';
      setCreateError({
        key,
        message: plans.length
          ? `Only ${plans.length} of ${payloads.length} programmes were created. ${message}`
          : message,
      });
      toast.error(
        plans.length
          ? `${plans.length} of ${payloads.length} programmes created — ${message}`
          : message,
      );
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

        />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Goal">
            <SelectInput value={goal} onChange={(e) => setGoal(e.target.value as MacroGoal)}>
              {MACRO_GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Total weeks">
            <TextInput inputMode="numeric" min={4} max={52} value={totalWeeksText}
              onChange={(e) => setTotalWeeksText(e.target.value)} />
          </FormField>
          <FormField label="Days per week">
            <TextInput inputMode="numeric" min={1} max={7} value={daysPerWeekText}
              onChange={(e) => setDaysPerWeekText(e.target.value)} />
          </FormField>
          <div className="self-end pb-2.5">
            <CheckboxField field={deloadField} label="Include deload" />
          </div>
        </div>

        <section className="mb-5">
          <h2 className="mb-1 text-[15px] font-[700]">
            {totalWeeks}-week block
          </h2>
          <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {days.join(' · ')}
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
                    {weeksLabel(phase.weeks)}
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
            {createError?.key === key && (
              <p role="alert" className="mt-3 text-[12px]" style={{ color: '#b91c1c' }}>
                {createError.message}
              </p>
            )}
          </section>
        ) : (
          <>
            <Button onClick={create} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create {payloads.length} programme{payloads.length === 1 ? '' : 's'}
            </Button>
            {createError?.key === key && (
              <p role="alert" className="mt-3 text-[12px]" style={{ color: '#b91c1c' }}>
                {createError.message}
              </p>
            )}
          </>
        )}
      </PageContainer>
    </Guard>
  );
}
