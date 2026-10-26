'use client';

// The K11 Program Design hub — step 6 of the intake journey.
//
// Five read-only sections built from records that already exist: the latest
// assessment, the newest interview, the active SMART goal and the active
// workout assignment. The arithmetic lives in lib/program-design; nothing on
// this page is saved, and a missing input shows "—" with a link to fill it.
//
// Steps 7 and 8 (the workout log and the formal retest) are ongoing tools, not
// journey steps: they live on the client profile once onboarding is complete.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle, Calculator, Dumbbell, HeartPulse, Loader2, Sparkles, Target, UtensilsCrossed,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Card, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import { api } from '@/lib/api';
import { ageFrom } from '@/lib/enrollment';
import { errorMessage } from '@/lib/forms/errors';
import {
  activityFactor, basalMetabolicRate, calorieTarget, karvonen, macroTargets, splitForDays, tdee,
  type Sex,
} from '@/lib/program-design';
import { semantic } from '@/lib/palette';

const GOAL_LABEL: Record<string, string> = {
  fat_loss: 'Fat loss', weight_loss: 'Weight loss', muscle_gain: 'Muscle gain',
  strength: 'Strength', endurance: 'Endurance', general_fitness: 'General fitness',
};

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const fmt = (v: number | null, unit = ''): string =>
  v == null ? '—' : `${v.toLocaleString('en-IN')}${unit ? ` ${unit}` : ''}`;

export default function ProgramDesignPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: semantic.primary }} /></div>}>
        <ProgramDesignContent />
      </Suspense>
    </Guard>
  );
}

function ProgramDesignContent() {
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';
  if (!clientId) {
    return <ClientPicker title="Program Design" icon={<Dumbbell size={20} color="#fff" />} basePath="/pt-os/program-design" />;
  }
  return <ProgramDesign key={clientId} clientId={clientId} />;
}

interface Row { [key: string]: unknown }

function ProgramDesign({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<Row | null>(null);
  const [assessment, setAssessment] = useState<Row | null>(null);
  const [interview, setInterview] = useState<Row | null>(null);
  const [goal, setGoal] = useState<Row | null>(null);
  const [activePlan, setActivePlan] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, assessRes, interviewRes, goalRes, assignRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Row | null }>,
        api.progress.assessments.list({ client_id: clientId, limit: 1 }) as Promise<{ data?: Row[] }>,
        api.pt.interviews.list(clientId) as unknown as Promise<{ data?: Row[] }>,
        api.progress.goals.list({ client_id: clientId }) as Promise<{ data?: Row[] }>,
        api.workouts.assignments.list({ client_id: clientId, status: 'active' }).catch(() => [] as Row[]),
      ]);
      const c = clientRes?.data ?? null;
      if (!c) { setLoadError('Client not found.'); return; }
      setClient(c);

      const assessments = [...(assessRes?.data ?? [])].sort(
        (a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')),
      );
      setAssessment(assessments[0] ?? null);

      const interviews = [...(interviewRes?.data ?? [])].sort(
        (a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
      );
      setInterview(interviews.find((r) => num(r.lifestyle_training_days) != null) ?? interviews[0] ?? null);

      setGoal((goalRes?.data ?? []).find((g) => g.is_active === true) ?? null);
      setActivePlan((assignRes as Row[]).find((a) => a.status === 'active') ?? null);
    } catch (err: unknown) {
      setLoadError(errorMessage(err, 'Could not load this client.'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: semantic.primary }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600]" style={{ color: 'var(--text-secondary)' }}>{loadError}</p>
        <button type="button" onClick={load} className="mt-4 rounded-[12px] px-4 py-2 text-[13px] font-[700]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>Retry</button>
      </div>
    );
  }

  const c = client ?? {};
  const sex: Sex | null = c.gender === 'male' || c.gender === 'female' ? c.gender : null;
  const age = ageFrom(c.dob ? String(c.dob) : null);
  const weightKg = num(assessment?.weight) ?? num(c.weight);
  const heightCm = num(assessment?.height_cm) ?? num(c.height);
  const restingHr = num(assessment?.resting_heart_rate);
  const trainingDays = num(interview?.lifestyle_training_days) ?? num(c.sessions_per_week);
  const goalKey = goal ? String(goal.goal_type ?? '') : (c.goal ? String(c.goal) : null);

  const bmr = basalMetabolicRate({
    sex, age, weightKg, heightCm, measuredBmr: num(assessment?.bmr),
    restingHeartRate: restingHr, trainingDays, goal: goalKey,
  });
  const factor = activityFactor(trainingDays);
  const tdeeKcal = tdee(bmr, factor);
  const calories = calorieTarget(tdeeKcal, goalKey, sex);
  const macros = macroTargets(calories, weightKg);
  const split = splitForDays(trainingDays);
  const hr = karvonen(age, restingHr);
  const goalLabel = goal
    ? (GOAL_LABEL[String(goal.goal_type)] ?? String(goal.goal_type ?? 'Goal'))
    : null;

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} color="#fff" />}
        title="Program Design"
        subtitle={`Step 6 — training and nutrition plan for ${String(c.name ?? 'this client')}.`}
      />

      <div className="space-y-4">
        {/* ── 1. Baseline ── */}
        <Card className="p-4">
          <h2 className="mb-2 text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Baseline</h2>
          {assessment ? (
            <>
              <p className="mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Latest assessment: {String(assessment.assessment_date ?? '').slice(0, 10)}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
                <Fact label="Weight" value={fmt(weightKg, 'kg')} />
                <Fact label="Height" value={fmt(heightCm, 'cm')} />
                <Fact label="Body fat" value={assessment.body_fat_pct == null ? '—' : `${assessment.body_fat_pct}%`} />
                <Fact label="Resting HR" value={fmt(restingHr, 'bpm')} />
              </dl>
            </>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              No fitness assessment yet.{' '}
              <Link className="font-[700]" style={{ color: semantic.primary }} href={`/pt-os/assessment?client_id=${clientId}`}>
                Complete the assessment
              </Link>
            </p>
          )}
          <div className="mt-3 border-t pt-3 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            {goal ? (
              <>
                Active goal: <span className="font-[700]" style={{ color: 'var(--text-primary)' }}>{goalLabel}</span>
                {num(goal.target_weight) != null && <> · target {fmt(num(goal.target_weight), 'kg')}</>}
                {num(goal.target_body_fat) != null && <> · body fat {fmt(num(goal.target_body_fat), '%')}</>}
              </>
            ) : (
              <>
                No active SMART goal.{' '}
                <Link className="font-[700]" style={{ color: semantic.primary }} href={`/pt-os/goals?client_id=${clientId}`}>
                  Set a goal
                </Link>
              </>
            )}
          </div>
        </Card>

        {/* ── 2. Nutrition targets ── */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <UtensilsCrossed size={15} style={{ color: semantic.primary }} />
            <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Nutrition targets</h2>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
            <Fact label="BMR" value={fmt(bmr, 'kcal')} />
            <Fact label="Activity factor" value={`× ${factor}`} />
            <Fact label="TDEE" value={fmt(tdeeKcal, 'kcal')} />
            <Fact label="Calorie target" value={fmt(calories, 'kcal')} />
            <Fact label="Protein" value={fmt(macros?.protein_g ?? null, 'g')} />
            <Fact label="Fat" value={fmt(macros?.fat_g ?? null, 'g')} />
            <Fact label="Carbs" value={fmt(macros?.carbs_g ?? null, 'g')} />
          </dl>
          {!bmr && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Add sex, age, height and weight to compute BMR/TDEE.
            </p>
          )}
          <Link className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-[700]" style={{ color: semantic.primary }}
            href={`/pt-os/diet-plans?client_id=${clientId}`}>
            <UtensilsCrossed size={13} /> Open Diet Plans
          </Link>
        </Card>

        {/* ── 3. Workout schedule ── */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Dumbbell size={15} style={{ color: semantic.primary }} />
            <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Workout schedule</h2>
          </div>
          {split ? (
            <>
              <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {split.name} · {trainingDays} day{trainingDays === 1 ? '' : 's'}/week
              </p>
              <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{split.sessions.join(' · ')}</p>
            </>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              Add the client&apos;s training days in the Client Interview to get a split.
            </p>
          )}
          <p className="mt-2 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            Beginners: 15–20 RM, stop short of muscular failure.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[12.5px] font-[700]">
            <Link className="inline-flex items-center gap-1.5" style={{ color: semantic.primary }} href={`/pt-os/clients/${clientId}?tab=ai`}>
              <Sparkles size={13} /> Generate with AI
            </Link>
            <Link className="inline-flex items-center gap-1.5" style={{ color: semantic.primary }} href={`/pt-os/workout-generator?client_id=${clientId}`}>
              <Sparkles size={13} /> Workout Generator
            </Link>
            <Link className="inline-flex items-center gap-1.5" style={{ color: semantic.primary }} href={`/pt-os/workout-plans?client_id=${clientId}`}>
              <Dumbbell size={13} /> Workout Plans
            </Link>
          </div>
        </Card>

        {/* ── 4. Cardio target zone ── */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <HeartPulse size={15} style={{ color: semantic.primary }} />
            <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Cardio target zone</h2>
          </div>
          {hr ? (
            <>
              <p className="mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Max HR {hr.maxHr} bpm (age estimate) · Karvonen, from resting HR {restingHr} bpm
              </p>
              <dl className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-4">
                {hr.zones.map((z) => <Fact key={z.label} label={z.label} value={`${z.low}–${z.high} bpm`} />)}
              </dl>
            </>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              Needs a date of birth and a resting heart rate — both come from the assessment.
            </p>
          )}
          <Link className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-[700]" style={{ color: semantic.primary }}
            href="/pt-os/cardio-calculator">
            <Calculator size={13} /> Open cardio calculator
          </Link>
        </Card>

        {/* ── 5. Completion ── */}
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target size={15} style={{ color: semantic.primary }} />
            <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Completion</h2>
          </div>
          {activePlan ? (
            <p role="status" className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              Active plan: <span className="font-[700]" style={{ color: 'var(--text-primary)' }}>{String(activePlan.plan_name ?? 'Workout plan')}</span>.
              Program Design is done when the plan is assigned.
            </p>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              Assign a workout plan to complete this step.
            </p>
          )}
          <div className="mt-3">
            <JourneyNextButton clientId={clientId} current="program_design" />
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-[650] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="font-[700]" style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  );
}
