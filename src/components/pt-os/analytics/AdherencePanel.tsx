'use client';

// "Did they show up?" — the first thing a trainer wants and the last thing
// most systems can answer.
//
// ── Why the denominator is the whole point ────────────────────────────────
//
// The number is easy to compute and easy to compute WRONG in a way nobody
// notices. A client three weeks into a twelve-week block who has not missed a
// session is 100% adherent, not 25% — but counting the whole block gives 25%,
// and that reads as a client with a problem. The server counts only weeks that
// have started; this panel says which weeks those are, so the figure can be
// checked rather than believed.
//
// ── Why a bonus session is shown separately ───────────────────────────────
//
// Four sessions in week 1 and none in week 2 is 50%, not 100%. The extra
// session is real and worth seeing, but if it fills week 2's hole the chart
// hides exactly what it exists to show.
//
// ── One measure, zero-anchored ────────────────────────────────────────────
//
// Sessions per week against the target, as bars from zero. A truncated axis on
// a count that runs 0-4 turns one missed session into a cliff.

import { CalendarCheck, TriangleAlert } from 'lucide-react';
import type { WorkoutAdherence, WorkoutThisWeek } from '@/lib/api';
import { PremiumBarChart, semantic, navy } from '@/components/visualizations';

const DAY_NAME = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AdherencePanelProps {
  adherence: WorkoutAdherence;
  thisWeek: WorkoutThisWeek | null;
  planName?: string | null;
}

export default function AdherencePanel({ adherence, thisWeek, planName }: AdherencePanelProps) {
  const { pct, planned, completed, weeks } = adherence;

  // No active programme. Saying so beats printing 0%, which reads as a client
  // who never turns up rather than one with nothing assigned.
  if (pct == null) {
    return (
      <Card>
        <Head />
        <p className="py-4 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No active programme, so there is nothing to measure attendance against.
          Assign one and adherence starts from its first week.
        </p>
      </Card>
    );
  }

  const tone = pct >= 85 ? 'var(--success-text)' : pct >= 60 ? 'var(--warning-text)' : 'var(--danger-text)';

  // One row per week: `completed` stacked under `extra`, `completed`'s own
  // colour set per week (met target vs fell short) via colorKey — the one
  // signal a single-colour series can't carry. Zero-anchored, same as the
  // bar this replaces: PremiumBarChart never truncates its value axis.
  const chartData = weeks.map((w) => ({
    week: `${w.week_start.slice(8, 10)}/${w.week_start.slice(5, 7)}`,
    weekStart: w.week_start,
    completed: w.completed,
    extra: w.extra,
    completedColor: w.completed >= w.planned ? semantic.success : semantic.danger,
  }));

  return (
    <Card>
      <Head />

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[28px] font-[860] tracking-[-0.02em]" style={{ color: tone }}>{pct}%</span>
        <span className="text-[12.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
          {completed} of {planned} session{planned === 1 ? '' : 's'}
          {planName ? ` · ${planName}` : ''}
        </span>
      </div>

      {/* Weeks so far, one bar each. Labelled with the week's start so the
          figure above can be checked against the calendar rather than taken
          on trust. */}
      <PremiumBarChart
        data={chartData}
        xKey="week"
        bars={[
          { key: 'completed', label: 'Completed', colorKey: 'completedColor' },
          { key: 'extra', label: 'Extra session', color: navy.muted },
        ]}
        groupMode="stacked"
        height={150}
        bordered={false}
        showLegend={false}
        ariaLabel={`Sessions completed per week: ${weeks.map((w) => `${w.week_start} ${w.completed} of ${w.planned}`).join('; ')}`}
      />

      <Legend />

      {/* This week, as facts rather than advice. What to do about a missed
          Wednesday depends on the client's week, their knee and a
          conversation — none of which is in this database. */}
      {thisWeek && (thisWeek.missed.length > 0 || thisWeek.remaining.length > 0) && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          {thisWeek.missed.length > 0 && (
            <p className="flex items-center gap-1.5 text-[12px] font-[650]" style={{ color: 'var(--danger-text)' }}>
              <TriangleAlert size={13} className="shrink-0" />
              Missed this week: {thisWeek.missed.map((d) => DAY_NAME[d]).join(', ')}
            </p>
          )}
          {thisWeek.remaining.length > 0 && (
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Still to come: {thisWeek.remaining.map((d) => DAY_NAME[d]).join(', ')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Head() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-[8px]"
        style={{ background: 'rgba(5,150,105,0.14)', color: '#059669' }}>
        <CalendarCheck size={14} />
      </div>
      <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
        Attendance
      </span>
    </div>
  );
}

/**
 * Three colours mean three things, so they are named.
 *
 * Colour alone would carry the whole meaning here, which fails for anyone who
 * cannot separate the green from the red.
 */
function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {[
        ['#059669', 'Target met'],
        ['var(--danger-text)', 'Short of target'],
        ['#94a3b8', 'Extra session'],
      ].map(([c, label]) => (
        <span key={label} className="flex items-center gap-1 text-[10px] font-[650]" style={{ color: 'var(--text-muted)' }}>
          <span className="h-2 w-2 rounded-[3px]" style={{ background: c }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}
