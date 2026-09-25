'use client';
/**
 * Member — My diet.
 *
 * The diet plan the trainer assigned: the daily targets, then the meals in
 * order. A macro the plan does not state is shown as "—", never as 0 — zero
 * grams of protein is a claim, and nobody made it.
 *
 * From /api/me/diet, scoped server-side to the signed-in client.
 */

import { useEffect, useState } from 'react';
import { Apple } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, Stat, longDate,
} from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeDietMeal, MeDietPlan } from '@/lib/api';
import { rgba } from '@/lib/palette';

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snack',
  dinner: 'Dinner',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const g = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)} g`);

export default function MemberDietPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <DietBody />
      </MemberShell>
    </Guard>
  );
}

function DietBody() {
  const [plans, setPlans] = useState<MeDietPlan[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.me.diet()
      .then((r) => { if (alive) setPlans(r.data ?? []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <><PageTitle icon={<Apple size={20} />} title="My diet" /><LoadError what="diet plan" /></>;
  if (!plans) return <PageSkeleton />;

  if (plans.length === 0) {
    return (
      <>
        <PageTitle icon={<Apple size={20} />} title="My diet" />
        <EmptyState
          icon={<Apple size={20} />}
          title="No diet plan yet"
          body="When your trainer assigns your diet plan, your daily targets and meals will appear here."
        />
      </>
    );
  }

  return (
    <>
      <PageTitle icon={<Apple size={20} />} title="My diet"
        sub={plans.length === 1 ? plans[0].name : `${plans.length} active plans`} />
      {plans.map((p) => <DietBlock key={p.assignment_id} plan={p} />)}
    </>
  );
}

function DietBlock({ plan }: { plan: MeDietPlan }) {
  // Meals tied to a weekday are grouped under it; the rest are the daily plan.
  const everyDay = plan.meals.filter((m) => m.day_of_week == null);
  const byDay = new Map<number, MeDietMeal[]>();
  for (const m of plan.meals) {
    if (m.day_of_week == null) continue;
    if (!byDay.has(m.day_of_week)) byDay.set(m.day_of_week, []);
    byDay.get(m.day_of_week)!.push(m);
  }

  return (
    <>
      <Section title="Daily targets"
        aside={plan.start_date ? <span className="text-[10.5px] font-[600]" style={{ color: MC.muted }}>Since {longDate(plan.start_date)}</span> : null}>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Calories" value={plan.daily.calories != null ? `${plan.daily.calories} kcal` : '—'} tone={MC.primaryDeep} />
          <Stat label="Protein" value={g(plan.daily.protein_g)} />
          <Stat label="Carbs" value={g(plan.daily.carbs_g)} />
          <Stat label="Fats" value={g(plan.daily.fats_g)} />
        </div>
        {plan.description && (
          <p className="mt-2.5 whitespace-pre-line text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{plan.description}</p>
        )}
      </Section>

      {plan.meals.length === 0 ? (
        <Section title="Meals">
          <Card className="p-4">
            <p className="text-[12.5px]" style={{ color: MC.muted }}>Your trainer has not added meals to this plan yet.</p>
          </Card>
        </Section>
      ) : (
        <>
          {everyDay.length > 0 && <MealList title="Every day" meals={everyDay} />}
          {[...byDay.entries()].sort(([a], [b]) => a - b).map(([day, meals]) => (
            <MealList key={day} title={DAY_NAMES[day] ?? `Day ${day}`} meals={meals} />
          ))}
        </>
      )}
    </>
  );
}

function MealList({ title, meals }: { title: string; meals: MeDietMeal[] }) {
  return (
    <Section title={title}>
      <Card>
        {meals.map((m, i) => (
          <div key={`${m.name}-${i}`} className="px-4 py-3"
            style={i === meals.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-block rounded-full px-2 py-0.5 text-[9.5px] font-[750] uppercase tracking-[0.08em]"
                  style={{ background: rgba(MC.success, 0.12), color: MC.success }}>
                  {MEAL_LABEL[m.meal_type] ?? m.meal_type}
                </span>
                <p className="mt-1 text-[13.5px] font-[720]" style={{ color: MC.ink }}>{m.name}</p>
                {m.serving_size && <p className="text-[11px] font-[600]" style={{ color: MC.muted }}>{m.serving_size}</p>}
              </div>
              <span className="shrink-0 text-[13px] font-[780] tabular-nums" style={{ color: MC.ink }}>{m.calories} kcal</span>
            </div>
            {m.description && (
              <p className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed" style={{ color: MC.muted }}>{m.description}</p>
            )}
            <p className="mt-1.5 text-[11px] font-[600] tabular-nums" style={{ color: MC.muted }}>
              P {g(m.protein_g)} · C {g(m.carbs_g)} · F {g(m.fats_g)}
            </p>
          </div>
        ))}
      </Card>
    </Section>
  );
}
