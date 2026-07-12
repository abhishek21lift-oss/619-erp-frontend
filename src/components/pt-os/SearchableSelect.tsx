'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Emoji or short glyph shown before the label. */
  icon?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (SearchableSelectOption | string)[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  /** When true (default), unmatched search text can be used as a freeform value. */
  allowCustom?: boolean;
}

/** A closed dropdown with an in-list filter input, and an optional freeform fallback. */
export function SearchableSelect({
  label, value, onChange, options, placeholder, error, required, allowCustom = true,
}: SearchableSelectProps) {
  const normalized: SearchableSelectOption[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filtered = normalized.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = normalized.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const selected = normalized.find((o) => o.value === value);

  return (
    <div className="relative" ref={wrapRef}>
      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
        {label} {required && <span style={{ color: '#F59E0B' }}>*</span>}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
        style={{
          background: open ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: error ? '1.5px solid rgba(239,68,68,0.5)' : open ? '1.5px solid rgba(245,158,11,0.50)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: open ? '0 0 0 3px rgba(245,158,11,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        <span className={cn('flex-1 text-[13px] font-[500]', value ? 'text-[rgb(15,23,42)]' : 'text-[rgb(148,163,184)]')}>
          {selected ? <>{selected.icon && <span className="mr-1.5">{selected.icon}</span>}{selected.label}</> : (value || placeholder || `Select ${label}`)}
        </span>
        <ChevronDown size={14} style={{ color: 'rgb(148,163,184)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
      </button>
      {error && <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          >
            <div className="border-b p-2" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
                style={{ background: 'var(--bg-subtle)', color: 'rgb(15,23,42)' }}
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map((opt) => (
                <button
                  key={opt.value} type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                  className="flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition hover:bg-slate-50"
                  style={{ color: 'rgb(30,30,40)' }}
                >
                  <span>{opt.icon && <span className="mr-2">{opt.icon}</span>}{opt.label}</span>
                  {value === opt.value && <Check size={12} style={{ color: '#F59E0B' }} />}
                </button>
              ))}
              {allowCustom && query.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => { onChange(query.trim()); setOpen(false); setQuery(''); }}
                  className="flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition hover:bg-slate-50"
                  style={{ color: '#F59E0B' }}
                >
                  <Plus size={12} /> Use &quot;{query.trim()}&quot;
                </button>
              )}
              {filtered.length === 0 && !query.trim() && (
                <p className="px-3.5 py-3 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>No options</p>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchableSelect;
