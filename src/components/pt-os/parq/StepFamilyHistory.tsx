'use client';

import { Users, Plus, Trash2, Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { ParqFormData, FamilyHistoryRowForm } from './types';
import { FAMILY_RELATIONS, FAMILY_CONDITION_FIELDS, initFamilyHistoryRow } from './types';

interface StepFamilyHistoryProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
}

export function StepFamilyHistory({ form, set, error }: StepFamilyHistoryProps) {
  const rows = form.familyHistory;

  const addRow = () => set('familyHistory', [...rows, initFamilyHistoryRow()]);
  const removeRow = (key: string) => set('familyHistory', rows.filter((r) => r._key !== key));
  const updateRow = (key: string, patch: Partial<FamilyHistoryRowForm>) => {
    set('familyHistory', rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
              <Users size={20} color="#F59E0B" />
            </div>
            <div>
              <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Family Medical History</h2>
              <p className="text-[13px] text-slate-400 mt-1.5">Step 4 of 9 — add a row per relative with a relevant condition.</p>
            </div>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="rounded-[16px] p-6 text-center" style={{ background: 'var(--bg-subtle)' }}>
            <p className="text-[13px] font-[600] text-slate-500">No family history added yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={row._key} className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.07)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-[12px] font-[750] uppercase tracking-wide" style={{ color: '#94a3b8' }}>Relative #{i + 1}</p>
                <button type="button" onClick={() => removeRow(row._key)} className="flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[650]" style={{ color: '#dc2626', background: 'rgba(239,68,68,0.08)' }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {FAMILY_RELATIONS.map((r) => {
                  const selected = row.relation === r.value;
                  return (
                    <button
                      key={r.value} type="button" onClick={() => updateRow(row._key, { relation: r.value })}
                      className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700] transition-all"
                      style={{ background: selected ? '#0f172a' : '#fff', color: selected ? '#fff' : '#64748b', border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0' }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {FAMILY_CONDITION_FIELDS.map((c) => {
                  const checked = row[c.key] as boolean;
                  return (
                    <button
                      key={String(c.key)} type="button"
                      onClick={() => updateRow(row._key, { [c.key]: !checked } as Partial<FamilyHistoryRowForm>)}
                      className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-left transition-all"
                      style={{ background: checked ? 'rgba(245,158,11,0.08)' : '#fff', border: checked ? '1.5px solid #F59E0B' : '1.5px solid #e2e8f0' }}
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px]" style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}>
                        {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                      </span>
                      <span className="text-[11px] font-[650]" style={{ color: checked ? '#0f172a' : '#64748b' }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatInput label="Age of Onset" type="number" value={row.age_of_onset} onChange={(v) => updateRow(row._key, { age_of_onset: v })} />
                <FloatInput label="Notes" value={row.notes} onChange={(v) => updateRow(row._key, { notes: v })} />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button" onClick={addRow}
          className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-[13px] font-[700] transition-all"
          style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1.5px dashed rgba(245,158,11,0.4)' }}
        >
          <Plus size={14} /> Add Family Member
        </button>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepFamilyHistory;
