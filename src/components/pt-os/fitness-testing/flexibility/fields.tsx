'use client';

// The two control shapes every flexibility screen uses, so four tests cannot
// drift into four different-looking forms.
//
// No `type="number"` anywhere: the shared FloatInput is the only numeric
// control, which is what the plan requires and what keeps a scroll wheel from
// changing a recorded angle.

import FloatInput from '@/components/ui/FloatInput';
import { FormField, SelectInput } from '@/components/ui';
import { cn } from '@/components/ui/cn';

interface YesNoChipsProps {
  label: string;
  /** null = not answered yet. Absent is a state, not a "No". */
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  /** Right-aligned hint, e.g. the protocol's rule for this answer. */
  hint?: string;
  compact?: boolean;
}

/**
 * A tri-state Yes/No pair. Tapping the selected chip again clears the answer,
 * which is the only way back to "not answered" after a misclick — a trainer
 * should not have to reload the draft to fix a wrong tap.
 */
export function YesNoChips({ label, value, onChange, hint, compact }: YesNoChipsProps) {
  const chip = (v: boolean, text: string) => {
    const selected = value === v;
    return (
      <button
        key={text}
        type="button"
        aria-pressed={selected}
        title={selected ? 'Tap again to clear' : undefined}
        onClick={() => onChange(selected ? null : v)}
        className={cn(
          'rounded-full border px-3 py-1 text-[12px] font-[700] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected ? 'border-transparent text-white' : 'border-[var(--border-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        )}
        style={selected ? { background: 'var(--brand)', boxShadow: '0 6px 14px -8px var(--brand-glow)' } : undefined}
      >
        {text}
      </button>
    );
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', compact ? 'justify-between' : 'flex-col items-start gap-y-1.5')}>
      <span className="text-[12px] font-[640]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="flex items-center gap-2">
        {chip(true, 'Yes')}
        {chip(false, 'No')}
        {value === null && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>not answered</span>}
      </span>
      {hint && <span className="w-full text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}

interface EnumSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  /** Display text per option, when the stored value reads badly. */
  optionLabel?: (v: T) => string;
  description?: string;
}

export function EnumSelect<T extends string>({ label, value, options, onChange, optionLabel, description }: EnumSelectProps<T>) {
  return (
    <FormField label={label} description={description} density="compact">
      <SelectInput value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o} value={o}>{optionLabel ? optionLabel(o) : o}</option>)}
      </SelectInput>
    </FormField>
  );
}

interface MeasurementProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
}

/** A measured number on a flexibility screen. cm / degrees / inches. */
export function Measurement({ label, value, onChange, suffix, hint, min, max }: MeasurementProps) {
  const num = value.trim() === '' ? null : Number(value);
  const outOfRange = num != null && Number.isFinite(num) && ((min != null && num < min) || (max != null && num > max));
  return (
    <div>
      <FloatInput
        label={label}
        numeric="decimal"
        value={value}
        onChange={onChange}
        suffix={suffix}
        error={outOfRange ? `Expected ${min}–${max}${suffix ? ` ${suffix}` : ''}.` : undefined}
      />
      {hint && !outOfRange && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

export type InsightTone = 'ok' | 'watch' | 'info';

const INSIGHT_TOKENS: Record<InsightTone, { color: string; bg: string; border: string }> = {
  ok: { color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)' },
  watch: { color: 'var(--warning-text)', bg: 'var(--warning-bg)', border: 'var(--warning-border)' },
  info: { color: 'var(--text-secondary)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
};

/**
 * The live interpretation panel. Its content is always the output of
 * `deriveFlexibility` on the current form state, so what the trainer reads here
 * is exactly what the server will compute and store.
 */
export function Insight({ label, tone, rows, children }: {
  label: string;
  tone: InsightTone;
  rows?: { side: string; verdict: string; detail?: string }[];
  children?: React.ReactNode;
}) {
  const t = INSIGHT_TOKENS[tone];
  return (
    <div className="rounded-[14px] p-3" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <p className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: t.color }}>{label}</p>
      {rows && (
        <div className="mt-1.5 space-y-1">
          {rows.map((r) => (
            <div key={r.side} className="flex flex-wrap items-baseline gap-x-2">
              <span className="w-10 text-[11.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>{r.side}</span>
              <span className="text-[12.5px] font-[700]" style={{ color: t.color }}>{r.verdict}</span>
              {r.detail && <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{r.detail}</span>}
            </div>
          ))}
        </div>
      )}
      {children && <div className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{children}</div>}
    </div>
  );
}

/**
 * Shown in place of the live interpretation when a test is marked unable to
 * complete: `deriveFlexibility` returns no measurements for it, and inventing
 * a reading from partial answers would be worse than saying nothing.
 */
export function InsightUnavailable() {
  return (
    <div className="rounded-[14px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Live interpretation</p>
      <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        Marked as unable to complete — no interpretation is derived for this test.
      </p>
    </div>
  );
}

/** The notes field every test ends with. */
export function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FloatInput
      label="Notes (optional)"
      multiline
      autoGrow
      maxLength={2000}
      value={value}
      onChange={onChange}
      placeholder="Anything that affects how this test should be read"
    />
  );
}
