import * as React from 'react';
import { cn } from './cn';

export interface FilterChip {
  id: string;
  label: string;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterChips({ chips, value, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {chips.map((chip) => {
        const active = value === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange(chip.id)}
            className={cn(
              'rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition-all',
              active
                ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 border border-brand-500/20'
                : 'text-slate-500 dark:text-white/40 border border-transparent hover:text-slate-700 dark:hover:text-white/60',
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
