'use client';

/**
 * The member portal's building blocks, shared by Workout, Diet and Check-in.
 *
 * Same visual language as the dashboard: neutral cards on the canvas, small
 * uppercase section labels, one accent colour, and no invented figures — a
 * section with nothing to show says so plainly instead of rendering zeros.
 */

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { palette, rgba } from '@/lib/palette';

export const MC = {
  primary: palette.blue[500],
  primaryDeep: palette.blue[700],
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger: palette.red[500],
  ink: palette.gray[900],
  muted: palette.gray[500],
};

export const EASE = [0.16, 1, 0.3, 1] as const;

/** "12 Mar 2026", or null. Never "Invalid Date". */
export function longDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Page heading: title, one line of context, optional icon tile. */
export function PageTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string | null }) {
  return (
    <m.header
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mb-4 flex items-center gap-3"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
        style={{ background: rgba(MC.primary, 0.12), color: MC.primary }}>
        {icon}
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-[20px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>
          {title}
        </h1>
        {sub && <p className="mt-0.5 truncate text-[12.5px] font-[600]" style={{ color: MC.muted }}>{sub}</p>}
      </div>
    </m.header>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-[780] uppercase tracking-[0.13em]" style={{ color: MC.muted }}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[16px] ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}

/** Nothing to show yet — said as what happens next, not as an error. */
export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="px-5 py-8 text-center">
      <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full"
        style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
        {icon}
      </span>
      <p className="text-[14px] font-[750]" style={{ color: MC.ink }}>{title}</p>
      <p className="mx-auto mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{body}</p>
    </Card>
  );
}

export function LoadError({ what }: { what: string }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-[14px] font-[700]" style={{ color: MC.ink }}>We could not load your {what}</p>
      <p className="mt-1.5 text-[12.5px]" style={{ color: MC.muted }}>
        Refresh the page, and tell your trainer if it keeps happening.
      </p>
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />
        <div className="flex-1">
          <div className="h-4 w-2/5 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded" style={{ background: 'var(--bg-subtle)' }} />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-3 h-[110px] animate-pulse rounded-[16px]" style={{ background: 'var(--bg-subtle)' }} />
      ))}
    </div>
  );
}

/** A small labelled figure, for macro targets and readings. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-[9px] font-[720] uppercase tracking-[0.1em]" style={{ color: MC.muted }}>{label}</p>
      <p className="mt-1 text-[16px] font-[820] leading-none tabular-nums tracking-[-0.02em]"
        style={{ color: tone ?? MC.ink }}>
        {value}
      </p>
    </div>
  );
}
