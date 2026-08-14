'use client';

// The control that makes the new prescription model visible.
//
// ── What the old builder could not do ──────────────────────────────────────
//
// It rendered SETS / REPS / WEIGHT / REST for every exercise, because the old
// schema had nothing else to render — sets and reps were NOT NULL DEFAULT
// 3/12, so a treadmill run was stored, and shown, as three sets of twelve.
//
// Here the field set is a function of `prescription_type`. Switch an exercise
// from SETS_REPS to TIME_DISTANCE and the sets/reps inputs are replaced by
// duration, distance, incline and pace — because those are the fields that
// type actually has.
//
// ── Where the field list comes from ────────────────────────────────────────
//
// The server, via GET /api/training/meta. Not from a constant in this repo.
// A copy here would drift from prescription.js the first time a type gained a
// field, and the failure is silent: a builder offering a field the API
// ignores, or hiding one it needs. lib/training/fields.ts owns only HOW to
// render a field — label, unit, step — which is presentation and has no
// server-side equivalent.
//
// A field the server names and fields.ts does not know still renders, under a
// derived label. Dropping it would make a new backend field unreachable in
// the UI, which is the same silent failure from the other side.

import { useMemo } from 'react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { orderFields, specFor, UNIT_OPTIONS } from '@/lib/training/fields';
import type { PrescriptionType, PrescriptionTypeMeta, TemplateExercise } from '@/lib/api';

export interface PrescriptionEditorProps {
  /** The row being edited. Partial so a not-yet-saved exercise works too. */
  value: Partial<TemplateExercise>;
  /** From GET /api/training/meta — the authority on which fields apply. */
  types: PrescriptionTypeMeta[];
  onChange: (patch: Partial<TemplateExercise>) => void;
  disabled?: boolean;
}

/** Empty string clears the field; the API reads null as "not prescribed". */
function toValue(raw: string, integer?: boolean): number | string | null {
  if (raw === '') return null;
  const n = integer ? parseInt(raw, 10) : parseFloat(raw);
  return Number.isFinite(n) ? n : raw;
}

export default function PrescriptionEditor({ value, types, onChange, disabled }: PrescriptionEditorProps) {
  const current = (value.prescription_type ?? 'SETS_REPS') as PrescriptionType;
  const meta = useMemo(() => types.find((t) => t.type === current), [types, current]);

  // Ordered for reading, not for the order the API happened to list them in.
  const fields = useMemo(() => orderFields(meta?.fields ?? []), [meta]);
  const required = new Set(meta?.required ?? []);

  const set = (field: string, v: unknown) => onChange({ [field]: v } as Partial<TemplateExercise>);

  return (
    <div className="space-y-4">
      <SearchableSelect
        label="Prescription"
        value={current}
        onChange={(v) => {
          // Only the type changes. The stale target_* values are deliberately
          // NOT cleared here: the server treats a field that does not belong
          // to the type as a warning rather than an error precisely so a
          // trainer can switch back without losing what they had typed.
          onChange({ prescription_type: v as PrescriptionType });
        }}
        options={types.map((t) => ({ value: t.type, label: t.type.replace(/_/g, ' ') }))}
        allowCustom={false}
      />

      {meta && (
        <p className="text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
          Logged as {meta.logs_as === 'cardio' ? 'a cardio effort' : meta.logs_as === 'sets' ? 'sets' : 'sets or cardio'}
          {required.size > 0 && ` · needs ${[...required].map((f) => specFor(f).label.toLowerCase()).join(' or ')}`}
        </p>
      )}

      {fields.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {/* CUSTOM's honest state: nothing is demanded, so nothing is shown
              beyond the notes the trainer writes on the row itself. */}
          A custom prescription takes no fixed fields — describe it in the notes.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          {fields.map((field) => {
            const spec = specFor(field);
            const raw = value[field as keyof TemplateExercise];
            const unitKey = spec.unitField;

            return (
              <div key={field} className={unitKey ? 'col-span-2 sm:col-span-1' : ''}>
                <FloatInput
                  label={`${spec.label}${spec.suffix ? ` (${spec.suffix})` : ''}`}
                  type={spec.label === 'Tempo' || field === 'percentage_metric' ? 'text' : 'number'}
                  required={required.has(field)}
                  disabled={disabled}
                  value={raw == null ? '' : String(raw)}
                  onChange={(v) => set(field, toValue(v, spec.integer))}
                />
                {unitKey && (
                  <div className="mt-2 flex gap-1.5">
                    {UNIT_OPTIONS[unitKey].map((u) => {
                      const active = (value[unitKey] ?? (unitKey === 'weight_unit' ? 'kg' : null)) === u;
                      return (
                        <button
                          key={u} type="button" disabled={disabled}
                          onClick={() => set(unitKey, u)}
                          className="rounded-[8px] px-2.5 py-1 text-[11.5px] font-[650] transition-colors"
                          style={{
                            background: active ? 'var(--brand-lo, #0067e0)' : 'var(--bg-subtle)',
                            color: active ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {u}
                        </button>
                      );
                    })}
                  </div>
                )}
                {spec.hint && (
                  <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>{spec.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
