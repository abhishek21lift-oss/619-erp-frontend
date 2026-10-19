'use client';

// A client search dropdown for the AI generator pages.
//
// The workout and diet generators require a client_id, but the nav, the
// landing page and the AI Coach shortcuts link to them bare — no client the
// link could carry, because none is known there. Rather than refusing at
// Generate time, both pages render this picker when ?client_id= is absent.
// Same behaviour as the progress-analysis page's inline picker, extracted so
// the three cannot drift apart on it.
//
// The menu itself is `--bg-elevated`, not `--bg-card`: card is translucent
// (rgba white 0.8 over light, slate 0.7 over dark) and a dropdown you can read
// the page through stops looking like a menu. Options are real combobox
// options — arrows move, Enter picks, Escape closes — and the input keeps
// focus while a row is clicked (mousedown is prevented) so the click lands.

import { useEffect, useId, useState } from 'react';
import { Loader2, User, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

export interface AiClientOption {
  id: number | string;
  name: string;
  email?: string;
}

export function AiClientPicker({
  selected,
  onSelect,
}: {
  selected: AiClientOption | null;
  onSelect: (c: AiClientOption | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AiClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = query ? api.clients.search(query) : api.clients.list({ limit: 20 });
    load
      .then((data) => { if (!cancelled) setOptions(data as unknown as AiClientOption[]); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  // No local filtering: `/api/pt-os/clients/search` already matched on name,
  // mobile, client id and email, so re-filtering by name would throw away the
  // mobile a trainer just typed in.
  const visible = options;

  const choose = (c: AiClientOption) => {
    onSelect(c);
    setQuery(c.name);
    setActive(0);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && open && visible[active]) {
      e.preventDefault();
      choose(visible[active]);
    }
  };

  const showMenu = open && (loading || visible.length > 0 || query.trim().length > 0);

  return (
    <div className="mb-6">
      <div className="mb-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
        Client
      </div>
      <div className="relative">
        <div className="relative">
          <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input
            aria-label="Search clients by name"
            role="combobox"
            aria-expanded={showMenu}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showMenu && visible[active] ? `${listId}-${visible[active].id}` : undefined}
            type="text"
            placeholder="Search clients by name…"
            value={selected ? selected.name : query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); onSelect(null); setActive(0); setOpen(true); }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            className="h-[52px] w-full rounded-[15px] py-2.5 pl-12 pr-4 text-[15px] font-[500] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {loading && (
            <Loader2 size={15} aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {showMenu && (
          <div
            id={listId}
            role="listbox"
            aria-label="Matching clients"
            data-no-pull-refresh
            className="absolute z-50 mt-1 w-full overflow-y-auto rounded-[14px]"
            style={{
              // Opaque on purpose: a menu over a form must not show the form
              // through it in either theme.
              background: 'var(--bg-elevated)', border: '1px solid var(--border-2)',
              boxShadow: 'var(--shadow-card-hover)', maxHeight: 220, overscrollBehavior: 'contain',
            }}
          >
            {loading && visible.length === 0 && (
              <div className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>Searching…</div>
            )}
            {!loading && visible.length === 0 && (
              <div className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                No clients match “{query}”.
              </div>
            )}
            {visible.map((c, i) => (
              <button
                key={c.id}
                id={`${listId}-${c.id}`}
                type="button"
                role="option"
                aria-selected={selected?.id === c.id}
                // mousedown is prevented so the input keeps focus and the
                // click on this row is not preceded by a blur that closes
                // the menu under the pointer.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onMouseEnter={() => setActive(i)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  background: i === active ? 'var(--bg-hover)' : 'transparent',
                  borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <div className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                  {c.email && <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-disabled)' }}>{c.email}</div>}
                </div>
                <ChevronRight size={14} style={{ color: '#94a3b8' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
