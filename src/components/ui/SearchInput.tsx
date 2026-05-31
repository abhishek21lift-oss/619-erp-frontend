import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './cn';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (val: string) => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  containerClassName,
  className,
  ...inputProps
}: SearchInputProps) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-[14px] bg-white/80 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-white/10 px-3.5 py-2.5 shadow-sm transition focus-within:border-rose-300 dark:focus-within:border-rose-400/50 focus-within:ring-2 focus-within:ring-rose-500/20',
        containerClassName,
      )}
    >
      <Search size={13} className="shrink-0 text-slate-400 dark:text-white/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-transparent text-[13px] font-medium text-[var(--text-primary)] outline-none placeholder:text-slate-400 dark:placeholder:text-white/30',
          className,
        )}
        {...inputProps}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="shrink-0 rounded-full p-0.5 text-slate-400 transition hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
