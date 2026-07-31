'use client';

// "How does this programme get harder?" — asked once, answered for every week.
//
// ── The problem it replaces ───────────────────────────────────────────────
//
// A programme stored ONE week and repeated it. So a trainer either accepted
// identical numbers for twelve weeks, or opened the builder every Monday and
// retyped them. The obvious alternative — author all twelve weeks — is 48
// day-plans for a 4-day split, which is exactly the spreadsheet feeling this
// redesign exists to remove.
//
// So the trainer answers one question instead: +2.5 kg a week, or +1 rep a
// week, or +0.5 RPE a week. Weeks 2..N are derived from week 1 and that rule.
// Nothing is stored per week, and any week can still be overridden by hand.
//
// ── Why the whole thing is four controls and not a rules engine ───────────
//
// What a coach writes on a whiteboard is "add 2.5 kg a week". Every extra knob
// is one more field standing between a trainer and a saved programme, and the
// escape hatch for the genuinely complex case already exists: write real rows
// for that week.
//
// ── Why it commits on change, not on blur ─────────────────────────────────
//
// The type and cadence are <select>s and the chips are buttons — a change IS
// the decision, there is no half-typed state to protect. The amount is a text
// field and commits on blur like every other number in the builder.

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { ProgressionType, WorkoutPlan } from '@/lib/api';

/** The unit and a sane default step for each rule, so the amount is never blank. */
const RULES: Record<ProgressionType, { label: string; unit: string; step: number; hint: string }> = {
  none: { label: 'Stays the same', unit: '', step: 0, hint: 'Every week repeats week 1 exactly.' },
  weight: { label: 'Add weight', unit: 'kg', step: 2.5, hint: 'Added to each exercise’s prescribed load.' },
  reps: { label: 'Add reps', unit: 'reps', step: 1, hint: 'Added to each exercise’s prescribed reps.' },
  rpe: { label: 'Push intensity', unit: 'RPE', step: 0.5, hint: 'Raises the target RPE, capped at 10.' },
};

const ORDER: ProgressionType[] = ['none', 'weight', 'reps', 'rpe'];

export interface ProgressionRuleProps {
  plan: WorkoutPlan;
  /** Persists the rule and hands back the server's plan (with a fresh preview). */
  onChange: (patch: {
    progression_type: ProgressionType;
    progression_amount: number | null;
    progression_every_weeks: number;
  }) => void;
}

export default function ProgressionRule({ plan, onChange }: ProgressionRuleProps) {
  const type = plan.progression_type ?? 'none';
  const every = plan.progression_every_weeks ?? 1;
  const rule = RULES[type];

  const committed = plan.progression_amount == null ? '' : String(plan.progression_amount);
  const [amount, setAmount] = useState(committed);
  const last = useRef(committed);

  useEffect(() => {
    if (committed !== last.current) { last.current = committed; setAmount(committed); }
  }, [committed]);

  const pickType = (next: ProgressionType) => {
    if (next === type) return;
    if (next === 'none') {
      onChange({ progression_type: 'none', progression_amount: null, progression_every_weeks: every });
      return;
    }
    // A rule with no amount cannot progress anything, and the database rejects
    // the pair outright — so picking a rule seeds its usual step rather than
    // leaving the trainer with an invalid programme and an error toast.
    const seeded = Number(amount);
    const value = Number.isFinite(seeded) && seeded > 0 ? seeded : RULES[next].step;
    last.current = String(value);
    setAmount(String(value));
    onChange({ progression_type: next, progression_amount: value, progression_every_weeks: every });
  };

  const commitAmount = () => {
    const trimmed = amount.trim();
    if (trimmed === last.current) return;
    const n = Number(trimmed);
    // Zero and negatives are rejected rather than stored: "add 0 kg a week" is
    // the 'none' rule wearing a disguise, and a negative would quietly walk a
    // client's load backwards for twelve weeks.
    if (!Number.isFinite(n) || n <= 0) { setAmount(last.current); return; }
    last.current = trimmed;
    onChange({ progression_type: type, progression_amount: n, progression_every_weeks: every });
  };

  return (
    <div
      className="mb-4 rounded-[20px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp size={15} style={{ color: 'var(--brand)' }} />
        <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          Each week, the programme…
        </p>
      </div>

      {/* Chips rather than a <select>: four options is few enough to show, and
          the choice is the whole point of the card. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Progression rule">
        {ORDER.map((t) => {
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pickType(t)}
              className="flex h-[44px] items-center rounded-[14px] px-3.5 text-[12.5px] font-[700] transition-colors"
              style={{
                background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {RULES[t].label}
            </button>
          );
        })}
      </div>

      {type === 'none' ? (
        <p className="mt-2.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {rule.hint}
        </p>
      ) : (
        <m.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                By
              </span>
              <div
                className="flex w-[104px] items-center overflow-hidden rounded-[12px]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={commitAmount}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') { setAmount(last.current); e.currentTarget.blur(); }
                  }}
                  inputMode="decimal"
                  aria-label={`Amount to add per step, in ${rule.unit}`}
                  className="h-[44px] w-full min-w-0 flex-1 bg-transparent px-2 text-center text-[14px] font-[700] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <span className="shrink-0 pr-2 text-[10px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  {rule.unit}
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Every
              </span>
              <select
                value={every}
                onChange={(e) => onChange({
                  progression_type: type,
                  progression_amount: plan.progression_amount ?? null,
                  progression_every_weeks: Number(e.target.value),
                })}
                className="h-[44px] rounded-[12px] px-2.5 text-[13px] font-[700] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'week' : `${n} weeks`}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {rule.hint} Week 1 is always the numbers you type below.
          </p>
        </m.div>
      )}
    </div>
  );
}
