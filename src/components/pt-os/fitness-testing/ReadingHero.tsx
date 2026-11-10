'use client';

import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { clampNumericText } from '@/components/ui/FloatInput';

/** The one reading a card leads with: 36px numeral, unit and status beside it. */
export function ReadingHero({ label, accent, children }: {
  label: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] bg-[var(--bg-subtle)] px-4 py-3.5 focus-within:ring-2 focus-within:ring-[var(--accent)]"
      style={{ '--accent': accent } as CSSProperties}
    >
      <p className="text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">{children}</div>
    </div>
  );
}

export function ReadingInput({ label, value, onChange, unit, width = 'default' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  width?: 'default' | 'narrow';
}) {
  const id = useId();
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        value={value}
        placeholder="—"
        onChange={(e) => onChange(clampNumericText(e.target.value, 'integer'))}
        className={`h-12 border-0 bg-transparent p-0 text-[36px] font-[760] leading-none tracking-[-0.045em] ${
          width === 'narrow' ? 'w-[62px]' : 'w-[78px]'
        }`}
        style={{ color: 'var(--text-primary)' }}
      />
      {unit && <span className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
    </span>
  );
}

/** The supporting tier: compact label, value and status in one row. */
export function SupportItem({ label, accent, tag, children }: {
  label: string;
  accent: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--bg-subtle)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-[650] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {tag && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[700]"
            style={{ background: `color-mix(in srgb, ${accent} 10%, transparent)`, color: `color-mix(in srgb, ${accent} 40%, var(--text-primary))` }}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">{children}</div>
    </div>
  );
}

export function SupportInput({ label, value, onChange, unit }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
}) {
  const id = useId();
  return (
    <span className="flex min-w-0 flex-1 items-baseline justify-end gap-1">
      <input
        id={id}
        aria-label={label}
        inputMode="numeric"
        value={value}
        placeholder="—"
        onChange={(e) => onChange(clampNumericText(e.target.value, 'integer'))}
        className="h-11 w-full min-w-0 border-0 bg-transparent p-0 text-right text-[15px] font-[700]"
        style={{ color: 'var(--text-primary)' }}
      />
      {unit && <span className="shrink-0 text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
    </span>
  );
}

/** A classification pill; the words carry the status, colour supports them. */
export function StatusChip({ pill, children }: {
  pill: { bg: string; color: string };
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[700]"
      style={{ background: pill.bg, color: pill.color }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
      {children}
    </span>
  );
}
