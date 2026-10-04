'use client';

// A client search dropdown for the AI generator pages.
//
// The workout and diet generators require a client_id, but the nav, the
// landing page and the AI Coach shortcuts link to them bare — no client the
// link could carry, because none is known there. Rather than refusing at
// Generate time, both pages render this picker when ?client_id= is absent.
// Same behaviour as the progress-analysis page's inline picker, extracted so
// the three cannot drift apart on it.

import { useEffect, useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    const load = query ? api.clients.search(query) : api.clients.list({ limit: 20 });
    load.then((data) => setOptions(data as unknown as AiClientOption[])).catch(() => {});
  }, [query]);

  const visible = options.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

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
            type="text"
            placeholder="Search clients by name…"
            value={selected ? selected.name : query}
            onFocus={() => { setOpen(true); if (selected) { setQuery(''); onSelect(null); } }}
            onChange={(e) => { setQuery(e.target.value); onSelect(null); setOpen(true); }}
            onBlur={() => setOpen(false)}
            className="h-[52px] w-full rounded-[15px] py-2.5 pl-12 pr-4 text-[15px] font-[500] outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {open && visible.length > 0 && (
          <div
            data-no-pull-refresh
            className="absolute z-20 mt-1 w-full overflow-y-auto rounded-[14px]"
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)', maxHeight: 220, overscrollBehavior: 'contain',
            }}
          >
            {visible.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(c); setQuery(c.name); setOpen(false); }}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none' }}
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
