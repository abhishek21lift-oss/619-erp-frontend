'use client';

export interface ChipOption {
  value: string;
  label: string;
  icon?: string;
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
              background: selected ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#f8fafc',
              color: selected ? '#fff' : '#64748b',
              border: selected ? 'none' : '1.5px solid #e2e8f0',
              boxShadow: selected ? '0 4px 14px rgba(245,158,11,0.30)' : 'none',
              transform: selected ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default MultiSelectChips;
