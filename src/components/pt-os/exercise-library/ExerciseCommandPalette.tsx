'use client';

import * as React from 'react';
import { Search, CornerDownLeft, Loader2, Star, Clock } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { api } from '@/lib/api';
import type { LibraryExercise } from '@/lib/api';

/**
 * ⌘K over the whole library.
 *
 * Opens on recents, so the common case — reaching for something you programmed
 * last week — costs one keystroke and no typing. Beyond that it is the same
 * ranked full-text search the grid uses, just rendered as a list you can walk
 * with the arrow keys.
 */

export interface ExerciseCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ex: LibraryExercise) => void;
}

export function ExerciseCommandPalette({ open, onClose, onSelect }: ExerciseCommandPaletteProps) {
  const [q, setQ] = React.useState('');
  const [results, setResults] = React.useState<LibraryExercise[]>([]);
  const [recents, setRecents] = React.useState<LibraryExercise[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef  = React.useRef<HTMLUListElement>(null);
  const reqId    = React.useRef(0);

  React.useEffect(() => {
    if (!open) { setQ(''); setResults([]); setActive(0); return; }
    inputRef.current?.focus();
    api.exercises.recent(8).then((r) => setRecents(r.exercises)).catch(() => setRecents([]));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) { setResults([]); setLoading(false); return; }

    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await api.exercises.list({ q: term, limit: 12 });
        if (id === reqId.current) { setResults(res.exercises); setActive(0); }
      } catch {
        if (id === reqId.current) setResults([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 160);
    return () => clearTimeout(t);
  }, [q, open]);

  const shown = q.trim() ? results : recents;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, shown.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = shown[active];
        if (pick) { onSelect(pick); onClose(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, shown, active, onSelect, onClose]);

  // Keep the highlighted row inside the scroll viewport when arrowing past its edge.
  React.useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    // Covers the backdrop as well as the panel: a drag anywhere over an open
    // palette belongs to the palette, never to the page behind it.
    <div data-no-pull-refresh className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search exercises"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a] animate-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3.5 dark:border-white/[0.07]">
          {loading
            ? <Loader2 size={16} className="shrink-0 animate-spin text-[var(--text-muted)]" />
            : <Search size={16} className="shrink-0 text-[var(--text-muted)]" />}
          <input aria-label="Search exercises"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises…"
            className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-slate-400 dark:placeholder:text-white/25"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] dark:border-white/10 sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {!q.trim() && recents.length > 0 && (
            <p className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <Clock size={10} /> Recently used
            </p>
          )}

          {shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
              {q.trim()
                ? `Nothing matches "${q.trim()}"`
                : 'Start typing to search the library'}
            </p>
          ) : (
            <ul ref={listRef} className="py-1">
              {shown.map((ex, i) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { onSelect(ex); onClose(); }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === active ? 'bg-[var(--brand)]/8' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-[var(--text-primary)]">
                        {ex.name}
                        {ex.is_favorite && (
                          <Star size={10} className="ml-1.5 inline text-amber-500" fill="currentColor" />
                        )}
                      </p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {ex.primary_muscle || ex.target_muscle}
                        {ex.equipment_name ? ` · ${ex.equipment_name}` : ''}
                      </p>
                    </div>
                    {ex.mechanic && (
                      <Badge tone={ex.mechanic === 'compound' ? 'brand' : 'purple'}>
                        {ex.mechanic === 'compound' ? 'Compound' : 'Isolation'}
                      </Badge>
                    )}
                    {i === active && (
                      <CornerDownLeft size={12} className="shrink-0 text-[var(--text-muted)]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-slate-200/80 px-4 py-2 text-[10.5px] text-[var(--text-muted)] dark:border-white/[0.07] sm:flex">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
