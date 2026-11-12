import type { AiDietCalculation, AiDietScheduleSlot, AiDietValidation } from '@/lib/api';

const WARN = '#B45309';

/**
 * What the engine calculated, as the server reported it. Every number here is
 * printed, never re-derived: a browser that recalculated the target would be a
 * second engine, and the two would disagree on exactly the plans that matter.
 */
export default function DietPlanSummary({
  calculation, schedule, validation,
}: {
  calculation: AiDietCalculation;
  schedule: AiDietScheduleSlot[];
  validation: AiDietValidation;
}) {
  const m = calculation.macros;
  const target = calculation.target;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[18px] px-5 py-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            Calculated targets
          </h2>
          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-[700]"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#047857' }}>
            engine v{calculation.version}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['BMR', calculation.bmr_kcal, 'kcal'],
            ['TDEE', calculation.tdee_kcal, 'kcal'],
            ['Target', calculation.calorie_target, 'kcal'],
            ['Water', calculation.water_ml, 'ml'],
            ['Protein', m.protein_g, 'g'],
            ['Carbs', m.carbs_g, 'g'],
            ['Fat', m.fat_g, 'g'],
            ['Fiber', calculation.fiber_g, 'g'],
          ].map(([label, value, unit]) => (
            <div key={String(label)}>
              <dt className="text-[10px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>{label}</dt>
              <dd className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {value == null ? '—' : `${value} ${unit}`}
              </dd>
            </div>
          ))}
        </dl>

        {target?.weight_kg != null && (
          <p className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Target weight {target.weight_kg} kg
            {target.delta_kg != null ? ` (${target.delta_kg > 0 ? '−' : '+'}${Math.abs(target.delta_kg)} kg)` : ''}
            {target.weekly_rate_kg != null ? ` · ${target.weekly_rate_kg} kg/week` : ''}
            {target.timeline_weeks != null ? ` · about ${target.timeline_weeks} weeks` : ''}
            {target.aggressive ? ' · faster than the safe rate' : ''}
          </p>
        )}

        {calculation.warnings.length > 0 && (
          <ul aria-label="Calculation warnings" className="mt-3 space-y-1">
            {calculation.warnings.map((w) => (
              <li key={w.code} className="text-[11.5px]" style={{ color: WARN }}>{w.message}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[18px] px-5 py-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Meal schedule</h2>
        <ol className="mt-2 flex flex-wrap gap-2">
          {schedule.map((slot) => (
            <li key={slot.slot} className="rounded-full px-3 py-1 text-[11.5px] font-[650]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
              {slot.label} · {slot.time}{slot.day_offset === 1 ? ' (next day)' : ''} · {slot.calories} kcal
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[18px] px-5 py-4" aria-live="polite"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          {validation.ok ? 'Passed every check' : 'Needs attention'}
        </h2>
        {!validation.ok && (
          <ul aria-label="Validation blockers" className="mt-2 list-disc space-y-1 pl-4">
            {validation.blockers.map((b) => (
              <li key={b} className="text-[12px]" style={{ color: '#dc2626' }}>{b}</li>
            ))}
          </ul>
        )}
        {validation.warnings.length > 0 && (
          <ul aria-label="Validation warnings" className="mt-2 list-disc space-y-1 pl-4">
            {validation.warnings.map((w) => (
              <li key={w} className="text-[12px]" style={{ color: WARN }}>{w}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
