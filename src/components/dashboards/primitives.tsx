'use client';

/**
 * Shared pieces of the studio dashboard.
 *
 * Deliberately small. An earlier draft of this file also carried a generic
 * `ProgressRing` and an `ELEVATION` scale, on the reasoning that
 * PtOsDashboard has three near-identical SVG rings in it (HealthRing,
 * TargetRing, and the one inside RevenueDonut). Both were dropped before
 * they shipped, for the same reason: nothing imported them.
 *
 * The ring in particular would have made things worse rather than better.
 * There are already TWO ProgressRing implementations in this codebase —
 * `components/fitness/ProgressRing.tsx` (exported, used by diet-plans) and a
 * private one in `components/revenue/MonthlyTargetHero.tsx` — so adding a
 * third under a fourth name is not consolidation, it is another copy with a
 * tidier comment on top. Unifying those is a real piece of work with its own
 * blast radius (three call sites, two of them outside this dashboard) and it
 * wants to be its own change, not a side effect of a visual pass.
 */

import { AlertTriangle, RotateCw } from 'lucide-react';
import { palette, rgba } from '@/lib/palette';

/**
 * A section marker.
 *
 * The dashboard had these as bare uppercase `<p>` elements, which meant the
 * screen had no heading structure at all below the studio name — a
 * screen-reader user had to read the cards themselves to work out where they
 * were. This is an `<h2>`, so the sections are skimmable.
 *
 * `action` is the optional right-hand affordance ("See all", a count).
 */
export function SectionHeader({
  children,
  action,
  className = '',
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2 flex items-baseline justify-between gap-3 px-1 ${className}`}>
      <h2
        className="text-[10px] font-[750] uppercase tracking-[0.14em]"
        style={{ color: rgba(palette.gray[500], 0.9) }}
      >
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * What the dashboard shows when a read fails.
 *
 * Without this the root rendered nothing at all: the skeleton is gated on
 * `loading`, the content on `data`, and a failed fetch leaves both false — so
 * the whole content area went blank, with no message and no way back, on the
 * screen every admin lands on after login. Logged as Critical #3 in
 * DASHBOARD-AUDIT.md and still live until now; guarded by
 * dashboard-error-state.test.tsx so it cannot silently come back.
 */
export function DashboardError({
  onRetry,
  title = 'Could not load your studio',
  detail = 'The dashboard could not be reached. Your data is safe — this is a connection problem.',
  retrying = false,
}: {
  onRetry: () => void;
  title?: string;
  detail?: string;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-[24px] px-6 py-12 text-center"
      style={{
        background: 'rgba(255,255,255,0.76)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.92)',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-[15px]"
        style={{ background: rgba(palette.amber[500], 0.12), color: palette.amber[600] }}
      >
        <AlertTriangle size={22} />
      </span>
      <p className="mt-3 text-[15px] font-[780]" style={{ color: palette.gray[900] }}>
        {title}
      </p>
      <p className="mt-1 max-w-[38ch] text-[12px] leading-[1.55]" style={{ color: palette.gray[600] }}>
        {detail}
      </p>
      {/* minHeight rather than a height class: html is 14px (globals.css:390),
          so Tailwind's rem sizes land 12.5% under what their names imply and
          an `h-11` here would be 38.5px, not 44. */}
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 inline-flex items-center gap-2 rounded-[13px] px-5 text-[12.5px] font-[750] text-white transition active:scale-[0.98] disabled:opacity-60"
        style={{
          minHeight: 44,
          background: `linear-gradient(135deg, ${palette.blue[450]}, ${palette.blue[600]})`,
          boxShadow: `0 6px 18px ${rgba(palette.blue[500], 0.34)}`,
        }}
      >
        <RotateCw size={14} className={retrying ? 'animate-spin' : undefined} />
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}
