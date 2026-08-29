import React from 'react';
import { rgba, semantic } from '@/lib/palette';
import { RadioTower } from 'lucide-react';

export const HeroHealth: React.FC<{ overallStatus: { color: string; bg: string; label: string; Icon: React.ComponentType<any> }; counts: { label: string; n: number; color: string }[]; durationMs: number; }>
= ({ overallStatus, counts, durationMs }) => (
  <div className="flex items-center gap-2.5 rounded-[16px] px-3.5 py-3 sm:gap-3 sm:px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[11px]" style={{ background: overallStatus.bg }}>
      <overallStatus.Icon size={17} color={overallStatus.color} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>Platform {overallStatus.label.toLowerCase()}</p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
        {counts.map((c, i) => (
          <span key={c.label} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden style={{ color: 'var(--text-disabled)' }}>·</span>}
            <span className="font-[700] tabular-nums" style={{ color: c.color }}>{c.n}</span>
            {c.label}
          </span>
        ))}
        <span className="hidden sm:inline">{' · '}collected in {durationMs} ms</span>
      </div>
    </div>
  </div>
);
