'use client';

// Client Profile → Training → Assigned Workouts.
//
// Which programmes this client is actually on, and how far through. Reads
// api.workouts.assignments.list, which is already typed as WorkoutAssignment
// and already consumed by clients/[id]/workout-log — so the shape is proven
// rather than invented here.
//
// Deliberately read-only. Assigning happens on the Programs screen, where the
// plan being assigned is in front of you; a second assign control here would
// be a second place to keep correct for no gain.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { CalendarDays, ChevronRight, ClipboardList, Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type { WorkoutAssignment } from '@/lib/api';
import { useToast } from '@/lib/toast';

const STATUS_TONE: Record<WorkoutAssignment['status'], { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  completed: { label: 'Completed', color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
  paused:    { label: 'Paused',    color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AssignedWorkoutsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const { toast } = useToast();
  const [rows, setRows] = useState<WorkoutAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // No status filter: past programmes are the point of this screen.
        const data = await api.workouts.assignments.list({ client_id: clientId });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error('Could not load assigned programmes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, toast]);

  // Active first, then most recently started. A client usually has one active
  // programme and a tail of finished ones; the active one is what a trainer
  // opened this screen for.
  const sorted = [...rows].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  return (
    <Guard roles={['admin', 'manager', 'trainer']}>
      <AppShell>
        <div className="mx-auto max-w-screen-md px-4 py-4">
          <h1 className="text-[20px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            Assigned Workouts
          </h1>
          <p className="mb-4 mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Programmes this client is on, and how far through.
          </p>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={22} />}
              title="No programmes assigned yet"
              description="Assign one from Workout Programs and it appears here."
              action={(
                <Link
                  href="/pt-os/workout-plans"
                  className="inline-flex h-[44px] items-center rounded-[14px] px-4 text-[13.5px] font-[700] text-white"
                  style={{ background: 'var(--brand)' }}
                >
                  Browse programmes
                </Link>
              )}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {sorted.map((a, i) => {
                const tone = STATUS_TONE[a.status] ?? STATUS_TONE.cancelled;
                // progress_pct is nullable in the DB despite the type; clamp so a
                // bad value cannot render a bar wider than its track.
                const pct = Math.max(0, Math.min(100, Number(a.progress_pct ?? 0)));
                return (
                  <m.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="rounded-[20px] p-4"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                          {a.plan_name}
                        </p>
                        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {a.duration_weeks} week{a.duration_weeks === 1 ? '' : 's'}
                          {' · '}{a.sessions_per_week}×/week
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[700] uppercase tracking-wide"
                        style={{ background: tone.bg, color: tone.color }}
                      >
                        {tone.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                      <CalendarDays size={13} />
                      {fmtDate(a.start_date)}{a.end_date ? ` → ${fmtDate(a.end_date)}` : ''}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-[650]">
                        <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                        <span style={{ color: 'var(--text-primary)' }}>{pct}%</span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-subtle)' }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${a.plan_name} progress`}
                      >
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone.color }} />
                      </div>
                    </div>

                    <Link
                      href={`/pt-os/clients/${clientId}/training/builder?plan=${a.workout_plan_id}`}
                      className="mt-3 flex h-[44px] items-center justify-between rounded-[12px] px-3 text-[13px] font-[700]"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--brand)' }}
                    >
                      Open in builder
                      <ChevronRight size={16} />
                    </Link>
                  </m.div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
