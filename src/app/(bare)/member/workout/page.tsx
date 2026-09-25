'use client';
/**
 * Member — My programme.
 *
 * The programme the trainer assigned, for the week the client has reached,
 * one card per training day with today's day opened first. Read-only: the
 * trainer writes the plan and logs the sessions at the studio; this is so the
 * client knows what they are doing before they walk in.
 *
 * From /api/me/workout, scoped server-side to the signed-in client.
 */

import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown, Dumbbell, Timer } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, EASE, longDate,
} from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeWorkoutExercise, MeWorkoutPlan } from '@/lib/api';
import { rgba } from '@/lib/palette';

const DAY_NAMES = ['Anytime', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "muscle_gain" → "Muscle gain". */
function sentence(v: string): string {
  const t = v.replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** 1 = Monday … 7 = Sunday, matching workout_exercises.day_of_week. */
function todayIso(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export default function MemberWorkoutPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <WorkoutBody />
      </MemberShell>
    </Guard>
  );
}

function WorkoutBody() {
  const [plans, setPlans] = useState<MeWorkoutPlan[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.me.workout()
      .then((r) => { if (alive) setPlans(r.data ?? []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <><PageTitle icon={<Dumbbell size={20} />} title="My programme" /><LoadError what="programme" /></>;
  if (!plans) return <PageSkeleton />;

  if (plans.length === 0) {
    return (
      <>
        <PageTitle icon={<Dumbbell size={20} />} title="My programme" />
        <EmptyState
          icon={<Dumbbell size={20} />}
          title="No programme yet"
          body="When your trainer assigns your programme, your exercises for each training day will appear here."
        />
      </>
    );
  }

  return (
    <>
      <PageTitle icon={<Dumbbell size={20} />} title="My programme"
        sub={plans.length === 1 ? plans[0].name : `${plans.length} active programmes`} />
      {plans.map((p) => <PlanBlock key={p.assignment_id} plan={p} titled={plans.length > 1} />)}
    </>
  );
}

/** `titled`: name the section after the plan only when there is more than one — otherwise the page title already says it. */
function PlanBlock({ plan, titled }: { plan: MeWorkoutPlan; titled: boolean }) {
  const today = todayIso();
  const firstOpen = useMemo(() => {
    const days = plan.days.map((d) => d.day_of_week);
    return days.includes(today) ? today : days[0];
  }, [plan.days, today]);
  const [open, setOpen] = useState<number | undefined>(firstOpen);

  const facts = [
    plan.current_week && plan.duration_weeks ? `Week ${plan.current_week} of ${plan.duration_weeks}`
      : plan.current_week ? `Week ${plan.current_week}` : null,
    plan.sessions_per_week ? `${plan.sessions_per_week}× a week` : null,
    plan.goal ? sentence(plan.goal) : null,
  ].filter(Boolean) as string[];

  return (
    <Section title={titled ? plan.name : 'This week'}
      aside={plan.end_date ? <span className="text-[10.5px] font-[600]" style={{ color: MC.muted }}>Ends {longDate(plan.end_date)}</span> : null}>
      {facts.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {facts.map((f) => (
            <span key={f} className="rounded-full px-2.5 py-1 text-[11px] font-[650]"
              style={{ background: rgba(MC.primary, 0.08), color: MC.primaryDeep }}>{f}</span>
          ))}
        </div>
      )}
      {plan.description && (
        <p className="mb-2.5 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{plan.description}</p>
      )}

      {plan.days.length === 0 ? (
        <Card className="p-4">
          <p className="text-[12.5px]" style={{ color: MC.muted }}>
            Your trainer has not added exercises to this programme yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {plan.days.map((d) => {
            const isOpen = open === d.day_of_week;
            const isToday = d.day_of_week === today;
            return (
              <Card key={d.day_of_week}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? undefined : d.day_of_week)}
                  aria-expanded={isOpen}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-[750]" style={{ color: MC.ink }}>
                      {DAY_NAMES[d.day_of_week] ?? `Day ${d.day_of_week}`}
                      {isToday && (
                        <span className="ml-2 rounded-full px-2 py-0.5 align-middle text-[9.5px] font-[750] uppercase tracking-[0.08em]"
                          style={{ background: MC.primary, color: '#fff' }}>Today</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11.5px] font-[550]" style={{ color: MC.muted }}>
                      {d.exercises.length} exercise{d.exercises.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronDown size={16} className="shrink-0 transition-transform"
                    style={{ color: MC.muted, transform: isOpen ? 'rotate(180deg)' : undefined }} />
                </button>
                {isOpen && (
                  <m.ol
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: EASE }}
                    className="border-t" style={{ borderColor: 'var(--border)' }}
                  >
                    {d.exercises.map((x, i) => <ExerciseRow key={`${x.name}-${i}`} x={x} n={i + 1} />)}
                  </m.ol>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function ExerciseRow({ x, n }: { x: MeWorkoutExercise; n: number }) {
  const prescription = [
    x.sets && x.reps ? `${x.sets} × ${x.reps}` : x.sets ? `${x.sets} sets` : x.reps ? `${x.reps} reps` : null,
    x.target_weight != null ? `${x.target_weight} kg` : null,
    x.rpe != null ? `RPE ${x.rpe}` : null,
    x.tempo ? `Tempo ${x.tempo}` : null,
  ].filter(Boolean) as string[];

  return (
    <li className="flex gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-[800] tabular-nums"
        style={{ background: 'var(--bg-subtle)', color: MC.ink }}>{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-[700]" style={{ color: MC.ink }}>{x.name}</p>
        {prescription.length > 0 && (
          <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[12.5px] font-[650] tabular-nums" style={{ color: MC.primaryDeep }}>
            {prescription.map((part, i) => (
              <span key={part} className="whitespace-nowrap">{i > 0 && '· '}{part}</span>
            ))}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px]" style={{ color: MC.muted }}>
          {x.rest_seconds ? <span className="inline-flex items-center gap-1"><Timer size={11} /> Rest {x.rest_seconds}s</span> : null}
          {x.equipment ? <span>{x.equipment}</span> : null}
        </div>
        {x.notes && <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: MC.muted }}>{x.notes}</p>}
        {x.video_url && (
          <a href={x.video_url} target="_blank" rel="noopener noreferrer"
            className="mt-1 inline-block text-[11.5px] font-[700]" style={{ color: MC.primary }}>
            Watch how →
          </a>
        )}
      </div>
    </li>
  );
}
