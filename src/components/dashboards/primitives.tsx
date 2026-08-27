'use client';

/**
 * Shared pieces of the studio dashboard.
 *
 * Deliberately one component. An earlier version of this file also carried a
 * `SectionHeader`, a generic `ProgressRing` and an elevation scale, as part of
 * a visual pass that has since been reverted. None of that is here: this file
 * exists solely so the dashboard has something to render when a read fails,
 * and adding anything decorative to it would be reintroducing the change by
 * the back door.
 */

import { AlertTriangle, RotateCw } from 'lucide-react';
import { palette, rgba } from '@/lib/palette';

/**
 * What the dashboard shows when a read fails.
 *
 * Without this the root renders NOTHING: the skeleton is gated on `loading`,
 * the content on `data`, and a failed fetch leaves both false — so the whole
 * content area goes blank, with no message and no way back, on the screen
 * every admin lands on after login. It is indistinguishable from a studio
 * with no data, which is why it went unnoticed long enough to be written up
 * as Critical #3 in DASHBOARD-AUDIT.md and then survive the report.
 *
 * The trainer dashboard has had a proper error branch with a retry all along
 * (trainer/dashboard/page.tsx). This is the same thing for the main one.
 *
 * Guarded by dashboard-error-state.test.tsx, which fails if the branch that
 * renders this is removed again.
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
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-[13px] px-5 text-[12.5px] font-[750] text-white transition active:scale-[0.98] disabled:opacity-60"
        style={{
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
