'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { ParqForm } from '@/lib/api/types';
import type { NutritionFormData } from './types';
import type { MealPreparer, NutritionBudget } from '@/lib/nutrition-calculations';

// PAR-Q owns medical conditions. This is a read-only summary of the latest
// submitted screening, kept in step with the labels the server scores from.
const QUESTION_LABELS: Record<number, string> = {
  1: 'Heart condition',
  6: 'Joint problem',
  7: 'Asthma, diabetes, epilepsy or high blood pressure',
  8: 'Diagnosed condition',
  9: 'Injury or condition under treatment',
  10: 'Other medical reason',
};

const PAST_HISTORY_CONDITIONS: Record<string, string> = {
  heart_disease: 'Heart disease',
  respiratory_disease: 'Respiratory disease',
  asthma: 'Asthma',
  copd: 'COPD',
  tuberculosis: 'Tuberculosis',
  joint_problems: 'Joint problems',
  previous_fractures: 'Previous fractures',
  surgeries: 'Previous surgery',
};

function parqConditionLabels(parq: ParqForm | null): string[] {
  if (!parq) return [];
  const out: string[] = [];
  const current = (parq.current_health ?? {}) as unknown as Record<string, unknown>;
  const past = (parq.past_history ?? {}) as unknown as Record<string, unknown>;
  if (current.known_disease === true) out.push('Known disease');
  if (current.current_treatment === true) out.push('Ongoing treatment');
  if (current.has_pain === true) out.push('Current pain');
  for (const [key, label] of Object.entries(PAST_HISTORY_CONDITIONS)) {
    if (past[key] === true) out.push(label);
  }
  for (const a of parq.parq_answers ?? []) {
    const label = QUESTION_LABELS[a.question_id];
    if (label && a.answer === 'yes') out.push(label);
  }
  return [...new Set(out)];
}

const MEAL_PREPARER_OPTIONS: { value: MealPreparer; label: string; icon: string }[] = [
  { value: 'self', label: 'Self', icon: '👤' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'cook', label: 'Personal Cook', icon: '👨‍🍳' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'food_delivery', label: 'Food Delivery', icon: '🛵' },
  { value: 'mess', label: 'Mess', icon: '🍛' },
  { value: 'hostel', label: 'Hostel', icon: '🏠' },
  { value: 'office_cafeteria', label: 'Office Cafeteria', icon: '🏢' },
];

const BUDGET_OPTIONS: { value: NutritionBudget; label: string }[] = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'premium', label: 'Premium' },
];

interface StepContextProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  clientId: string;
  parq: ParqForm | null;
  legacyMedicalConditions: string[];
}

export function StepContext({ form, set, clientId, parq, legacyMedicalConditions }: StepContextProps) {
  const conditions = parq
    ? parqConditionLabels(parq)
    : legacyMedicalConditions.filter((c) => c && c !== 'None');
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Wallet size={20} color="#FFBB94" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Context</h2>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Who Prepares Meals?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEAL_PREPARER_OPTIONS.map((o) => {
              const selected = form.mealPreparer === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('mealPreparer', o.value)}
                  className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                  style={{
                    background: selected ? 'rgba(163,55,87,0.06)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #A33757' : '2px solid var(--border)',
                    boxShadow: selected ? '0 4px 16px rgba(163,55,87,0.18)' : 'none',
                  }}
                >
                  <span className="text-[20px]">{o.icon}</span>
                  <span className="text-[11.5px] font-[700]" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nutrition Budget</p>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((o) => {
              const selected = form.nutritionBudget === o.value;
              return (
                <button
                  key={o.value} type="button" onClick={() => set('nutritionBudget', o.value)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? 'var(--text-primary)' : 'var(--bg-subtle)',
                    color: selected ? 'var(--bg-card)' : 'var(--text-muted)',
                    border: selected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Medical Conditions</p>
          <p className="mb-2 text-[12px] text-[color:var(--text-muted)]">
            Recorded in the PAR-Q and used for nutrition risk scoring.
          </p>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <span
                  key={c}
                  className="rounded-full px-3 py-1 text-[12px] font-[650]"
                  style={{ background: 'rgba(163,55,87,0.08)', color: '#852E4E', border: '1px solid rgba(163,55,87,0.2)' }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[color:var(--text-secondary)]">
              {parq ? 'None recorded on the PAR-Q.' : 'No submitted PAR-Q on file.'}
            </p>
          )}
          <Link
            href={`/pt-os/parq?client_id=${clientId}`}
            className="mt-2 inline-block text-[12px] font-[700]"
            style={{ color: '#852E4E' }}
          >
            Open PAR-Q
          </Link>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Medical Notes</p>
          <div className="max-w-sm">
            <FloatInput label="Medical notes" maxLength={2000} value={form.medicalNotes} onChange={(v) => set('medicalNotes', v)} />
          </div>
        </div>

    </div>
  );
}

export default StepContext;
