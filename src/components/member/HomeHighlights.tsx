'use client';

/**
 * Two tiles on member Home: the monthly recap and the goal closest to done.
 *
 * The recap tile shouts only when there is something to open — early in a
 * month, when last month's recap is ready. Otherwise it is the month so far.
 * Each tile loads on its own and simply stays away if its data does: Home
 * must never wait on, or break because of, either of them.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { CalendarRange, ChevronRight, Target } from 'lucide-react';
import { api } from '@/lib/api';
import type { MeGoal, MeRecap } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';
import { EASE, MC } from './MemberUI';
import { isEmptyMonth, monthName } from './recap';

function goalTitle(g: MeGoal): string {
  if (g.kind === 'lift') return `${g.exercise_name} ${g.target_value} kg`;
  if (g.kind === 'weight') return `Reach ${g.target_value} kg`;
  return `${g.target_value} sessions`;
}

export default function HomeHighlights() {
  const [recap, setRecap] = useState<MeRecap | null>(null);
  const [goal, setGoal] = useState<MeGoal | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    api.me.recap()
      .then((r) => { if (live) setRecap(isEmptyMonth(r.data) ? null : r.data); })
      .catch(() => { if (live) setRecap(null); });
    api.me.goals()
      .then((r) => {
        if (!live) return;
        const open = r.data.goals.filter((g) => !g.reached);
        open.sort((a, b) => (b.progress_pct ?? -1) - (a.progress_pct ?? -1));
        setGoal(open[0] ?? null);
      })
      .catch(() => { if (live) setGoal(undefined); });
    return () => { live = false; };
  }, []);

  const showGoal = goal !== undefined;
  if (!recap && !showGoal) return null;

  const fresh = recap && !recap.in_progress && new Date().getDate() <= 10;

  return (
    <div className={`mb-4 grid gap-2.5 ${recap && showGoal ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {recap && (
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
          <Link href={`/member/recap?month=${recap.month}`}
            className="relative flex h-full min-h-[118px] flex-col justify-between overflow-hidden rounded-[18px] p-3.5 text-white transition-transform active:scale-[0.98]"
            style={{ background: `linear-gradient(150deg, ${palette.gray[900]}, ${palette.blue[800]})` }}>
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full"
              style={{ background: `radial-gradient(circle, ${rgba(palette.blue[400], 0.5)}, transparent 70%)` }} />
            <span className="relative flex items-center gap-1.5 text-[10px] font-[780] uppercase tracking-[0.12em] opacity-80">
              <CalendarRange size={12} aria-hidden /> {fresh ? 'Recap ready' : 'So far'}
            </span>
            <span className="relative">
              <span className="block text-[16px] font-[820] leading-tight">{monthName(recap.month)}</span>
              <span className="mt-0.5 block text-[12px] font-[600] opacity-80">
                {recap.totals.sessions > 0
                  ? `${recap.totals.sessions} session${recap.totals.sessions === 1 ? '' : 's'}`
                  : `${recap.totals.visits} visit${recap.totals.visits === 1 ? '' : 's'}`}
                {recap.records.length > 0 ? ` · ${recap.records.length} PR${recap.records.length === 1 ? '' : 's'}` : ''}
              </span>
            </span>
          </Link>
        </m.div>
      )}

      {showGoal && (
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05, ease: EASE }}>
          <Link href="/member/goals"
            className="flex h-full min-h-[118px] flex-col justify-between rounded-[18px] p-3.5 transition-transform active:scale-[0.98]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span className="flex items-center justify-between gap-1 text-[10px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
              <span className="flex items-center gap-1.5"><Target size={12} aria-hidden style={{ color: MC.primary }} /> Goal</span>
              <ChevronRight size={13} aria-hidden />
            </span>
            {goal ? (
              <span>
                <span className="block truncate text-[14px] font-[800]" style={{ color: MC.ink }}>{goalTitle(goal)}</span>
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <m.span className="block h-full rounded-full" style={{ background: MC.primary }}
                      initial={{ width: 0 }} animate={{ width: `${goal.progress_pct ?? 0}%` }} transition={{ duration: 0.8, ease: EASE }} />
                  </span>
                  <span className="text-[11px] font-[800] tabular-nums" style={{ color: MC.ink }}>
                    {goal.progress_pct === null ? '—' : `${goal.progress_pct}%`}
                  </span>
                </span>
              </span>
            ) : (
              <span>
                <span className="block text-[14px] font-[800]" style={{ color: MC.ink }}>Set a goal</span>
                <span className="mt-0.5 block text-[12px]" style={{ color: MC.muted }}>We&apos;ll track it for you</span>
              </span>
            )}
          </Link>
        </m.div>
      )}
    </div>
  );
}
