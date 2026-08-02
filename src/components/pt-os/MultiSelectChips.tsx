'use client';

import type React from 'react';

export interface ChipOption {
  value: string;
  label: string;
  /**
   * ReactNode, not string, so a caller can pass a real icon element:
   *   icon: <Beer size={14} />
   *
   * It was `string` because every caller passed an emoji, which is
   * font-dependent, renders differently on every platform and cannot be
   * themed or recoloured with the chip's selected state. Widening rather than
   * replacing keeps the assessments still passing emoji compiling untouched —
   * a string is a ReactNode — so they can be converted on their own schedule
   * instead of in one sweep.
   */
  icon?: React.ReactNode;
}

interface MultiSelectChipsProps {
  value: string[];
  onChange: (v: string[]) => void;
  options: (ChipOption | string)[];
}

/** Toggle (not replace) multi-select chip row — mirrors the day-of-week
 *  toggle group pattern from clients/[id]/enroll/page.tsx. */
export function MultiSelectChips({ value, onChange, options }: MultiSelectChipsProps) {
  const normalized: ChipOption[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value} type="button" aria-pressed={selected}
            onClick={() => toggle(opt.value)}
            className="flex items-center gap-1.5 rounded-[11px] px-3.5 py-2.5 text-[12.5px] font-[640] transition-all duration-200"
            style={{
              background: selected ? 'linear-gradient(135deg, #0271EB, #0059CE)' : '#f8fafc',
              color: selected ? '#fff' : '#64748b',
              border: selected ? 'none' : '1.5px solid #e2e8f0',
              boxShadow: selected ? '0 4px 14px rgba(2,113,235,0.30)' : 'none',
              transform: selected ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {opt.icon && <span className="inline-flex items-center">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default MultiSelectChips;
