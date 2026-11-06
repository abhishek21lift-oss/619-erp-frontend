'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { FloatInput } from '@/components/ui';
import { TIGHT_MUSCLES, WEAK_MUSCLES } from './types';
import type { MuscleFinding, MuscleSide, MuscleStatus, PostureFormData } from './types';

interface StepMuscleImbalanceProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
}

const STATUSES: { value: MuscleStatus; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'tight', label: 'Tight' },
  { value: 'weak', label: 'Weak' },
];

const SIDES: { value: MuscleSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bilateral', label: 'Bilateral' },
];

function newFinding(muscle: string, status: MuscleStatus): MuscleFinding {
  return { id: `m-${muscle.toLowerCase().replace(/[^a-z]+/g, '-')}-${Date.now()}`, muscle, status, side: 'bilateral', notes: '' };
}

function Segmented<T extends string>({
  value, options, onChange, label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-[10px] p-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="min-h-[32px] rounded-[8px] px-2.5 text-[10.5px] font-[750] transition-all"
            style={{
              background: active ? (option.value === 'tight' ? '#A33757' : option.value === 'weak' ? '#0f172a' : '#fff') : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              boxShadow: active ? '0 2px 7px rgba(15,23,42,0.14)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function StepMuscleImbalance({ form, set }: StepMuscleImbalanceProps) {
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const selected = useMemo(() => new Set(form.muscleImbalances.map((m) => m.muscle)), [form.muscleImbalances]);

  const update = (id: string, patch: Partial<MuscleFinding>) => {
    set('muscleImbalances', form.muscleImbalances.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const add = (muscle: string, status: MuscleStatus) => {
    if (selected.has(muscle)) return;
    set('muscleImbalances', [...form.muscleImbalances, newFinding(muscle, status)]);
  };

  const groups = [
    { list: TIGHT_MUSCLES, status: 'tight' as const, search: leftSearch, setSearch: setLeftSearch, title: 'Tight / Overactive', icon: TrendingUp, tone: '#A33757' },
    { list: WEAK_MUSCLES, status: 'weak' as const, search: rightSearch, setSearch: setRightSearch, title: 'Weak / Underactive', icon: TrendingDown, tone: '#0f172a' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] px-3.5 py-3" style={{ background: 'rgba(163,55,87,0.05)', border: '1px solid rgba(163,55,87,0.14)' }}>
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Muscle findings are recorded only after the trainer confirms them. Static posture alone does not prove weakness, tightness or pain; leaving this section empty means <strong>not assessed</strong>, not normal.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          const matches = group.list.filter((m) => m.toLowerCase().includes(group.search.trim().toLowerCase()));
          return (
            <section key={group.title} className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: `${group.tone}14`, color: group.tone }}>
                  <Icon size={14} />
                </span>
                <h3 className="text-[12.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>{group.title}</h3>
                <span className="ml-auto text-[10px] font-[750]" style={{ color: 'var(--text-muted)' }}>
                  {group.list.filter((m) => selected.has(m)).length} selected
                </span>
              </div>

              <label className="flex min-h-[40px] items-center gap-2 rounded-[10px] px-2.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="sr-only">Search {group.title.toLowerCase()} muscles</span>
                <input
                  type="search"
                  value={group.search}
                  onChange={(e) => group.setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2 text-[12px] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </label>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {matches.map((muscle) => {
                  const isSelected = selected.has(muscle);
                  return (
                    <button
                      key={muscle}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => add(muscle, group.status)}
                      className="flex min-h-[34px] items-center gap-1 rounded-[9px] px-2.5 text-left text-[11px] font-[650] transition-all"
                      style={{
                        background: isSelected ? `${group.tone}12` : 'var(--bg-subtle)',
                        color: isSelected ? group.tone : 'var(--text-secondary)',
                        border: isSelected ? `1px solid ${group.tone}44` : '1px solid var(--border)',
                        opacity: isSelected ? 0.7 : 1,
                      }}
                    >
                      {!isSelected && <Plus size={10} />}
                      {muscle}
                    </button>
                  );
                })}
                {matches.length === 0 && (
                  <p className="py-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No muscle matches that search.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>Confirmed Findings</h3>
          <span className="text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
            {form.muscleImbalances.length} recorded
          </span>
        </div>

        {form.muscleImbalances.length === 0 ? (
          <p className="rounded-[12px] px-3.5 py-6 text-center text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            No muscle findings confirmed. Select a muscle above to record one.
          </p>
        ) : (
          <div className="space-y-2.5">
            {form.muscleImbalances.map((finding) => (
              <div key={finding.id} className="rounded-[14px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-[120px] flex-1 text-[12.5px] font-[780]" style={{ color: 'var(--text-primary)' }}>{finding.muscle}</p>
                  <button
                    type="button"
                    onClick={() => set('muscleImbalances', form.muscleImbalances.filter((m) => m.id !== finding.id))}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                    style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
                    aria-label={`Remove ${finding.muscle}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Segmented label={`${finding.muscle} status`} value={finding.status} options={STATUSES} onChange={(status) => update(finding.id, { status })} />
                  <Segmented label={`${finding.muscle} side`} value={finding.side} options={SIDES} onChange={(side) => update(finding.id, { side })} />
                </div>
                <div className="mt-2">
                  <FloatInput
                    label="Trainer notes"
                    maxLength={500}
                    value={finding.notes}
                    onChange={(notes) => update(finding.id, { notes })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StepMuscleImbalance;
