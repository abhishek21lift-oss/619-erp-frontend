'use client';

/**
 * Attendance — the day's register.
 *
 * Mark who came in, correct a record, and see who is turning up. Check-in
 * itself happens in one place, the QR scanner; this page reads and corrects
 * what it wrote.
 *
 * ── What changed in the redesign, beyond the look ──────────────────────────
 *
 * Wiring the old page got wrong while still rendering plausible numbers (the
 * arithmetic lives in lib/attendance-view.ts, with its tests):
 *
 *   · "Today" was the UTC date, so before 5:30 AM the page opened on yesterday.
 *   · Export opened `/api/attendance?format=csv`, which the API does not serve —
 *     it downloaded JSON. The CSV is now built here, for every active member.
 *   · Trends asked for `?days=` and `?months=`, which the API ignores, so every
 *     range showed the same latest 200 rows. It sends `from`/`to` now.
 *   · check_in arrives as an ISO timestamp and was glued onto '1970-01-01T':
 *     the feed's "min ago" and the peak-hours chart were computed from NaN.
 *   · Unmarked was roster size minus record count, which a record for anyone
 *     off the active roster pushed wrong.
 *   · The "weekly" chart was drawn from one day's records.
 *   · Mark All Present fired one request per member; it is one bulk request,
 *     asks first, and marks only the members still unmarked.
 *
 * Gone: a footer that claimed "all changes saved automatically" beside a
 * "Sync Devices" button that only refetched, a Quick Actions grid that
 * repeated the hero's buttons, and "AI-powered" alerts that were three
 * counts. Nothing here claims something the page does not do.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, Loader2, Plus, QrCode, RotateCcw, UserCheck, UserX, Users, X,
} from 'lucide-react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import {
  PullToRefresh, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, PageActions, PageContainer, PageHero, SearchField,
  Card, CardHeader, CardBody,
} from '@/components/ui';
import { api, Client, Attendance } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { useStore } from '@tanstack/react-form';
import { useAppForm } from '@/lib/forms/useAppForm';
import { DateFieldControl, TimeFieldControl, TextAreaField, FormErrorBanner } from '@/components/ui/form';
import {
  attendanceEntrySchema, blankAttendanceEntry, attendanceDateIssue,
  ATTENDANCE_STATUSES, type AttendanceEntryValues,
} from '@/lib/forms/schemas/attendance';
import {
  todayYmd, shiftDay, lastDays, dayLabel, clockTime, ago, summarize, dailySeries, peakHours,
  dayCsv, downloadCsv, type DaySummary,
} from '@/lib/attendance-view';
import {
  tones, gradient, attendanceMesh, ringStops, barGradient, type ToneName,
} from '@/components/attendance/attendanceTheme';

/* ────────────────────────────────────────────────────────────────
   STATUS — the meaning colours, from the palette
──────────────────────────────────────────────────────────────── */
type Status = 'present' | 'late' | 'absent' | 'unmarked';
type StatusFilter = 'all' | Status;

const STATUS: Record<Status, { label: string; short: string; color: string; ink: string; Icon: typeof UserCheck }> = {
  present:  { label: 'Present',  short: 'P', color: palette.emerald[500], ink: palette.emerald[700], Icon: UserCheck },
  late:     { label: 'Late',     short: 'L', color: palette.amber[500],   ink: palette.amber[700],   Icon: Clock },
  absent:   { label: 'Absent',   short: 'A', color: palette.red[500],     ink: palette.red[700],     Icon: UserX },
  unmarked: { label: 'Unmarked', short: '–', color: palette.gray[400],    ink: palette.gray[600],    Icon: Users },
};

type UndoState = {
  client: Client;
  prev: Attendance | undefined;
  kind: 'mark' | 'clear';
  message: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/* ────────────────────────────────────────────────────────────────
   ROOT
──────────────────────────────────────────────────────────────── */
export default function AttendancePage() {
  return (
    <Guard>
      {/* useSearchParams needs a Suspense boundary above it. */}
      <Suspense fallback={null}>
        <AttendanceContent />
      </Suspense>
    </Guard>
  );
}

type Tab = 'members' | 'insights' | 'alerts';

function AttendanceContent() {
  const { toast } = useToast();
  const today = todayYmd();

  const [date, setDate] = useState(today);
  const [clients, setClients] = useState<Client[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ id: string; status: Status } | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // ?tab=insights is what /attendance/reports redirects to, so the old
  // bookmark lands on the panel its content moved into rather than on the
  // member list.
  const sp = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    sp.get('tab') === 'insights' ? 'insights' : sp.get('tab') === 'alerts' ? 'alerts' : 'members',
  );

  /* ── Trends, fetched only once the tab is opened ── */
  const [range, setRange] = useState('7');
  const [rangeRecords, setRangeRecords] = useState<Attendance[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState<Attendance[]>([]);

  const loadDay = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api.clients.list({ status: 'active' }),
        api.attendance.list({ date, type: 'client' }),
      ]);
      setClients(c);
      setRecords(a);
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Could not load attendance'));
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => { void loadDay(); }, [loadDay]);

  useEffect(() => {
    if (activeTab !== 'insights') return;
    let alive = true;
    setRangeLoading(true);
    // `from`/`to`, which the API reads. It ignores `days` and `months`, which
    // is what this used to send — every range showed the same latest rows.
    const win = lastDays(Number(range), today);
    const year = lastDays(365, today);
    Promise.all([
      api.attendance.list({ ...win, type: 'client' }),
      api.attendance.list({ ...year, type: 'client' }),
    ])
      .then(([r, mo]) => {
        if (!alive) return;
        setRangeRecords(Array.isArray(r) ? r : []);
        setMonthlyRecords(Array.isArray(mo) ? mo : []);
      })
      .catch((e: unknown) => alive && toast.error(errorMessage(e, 'Could not load trends')))
      .finally(() => alive && setRangeLoading(false));
    return () => { alive = false; };
  }, [activeTab, range, today, toast]);

  const recordMap = useMemo(() => new Map(records.map((r) => [String(r.ref_id), r])), [records]);
  const statusOf = useCallback((c: Client): Status => {
    const s = recordMap.get(String(c.id))?.status;
    return s === 'present' || s === 'late' || s === 'absent' ? s : 'unmarked';
  }, [recordMap]);

  const summary = useMemo(() => summarize(clients, records), [clients, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q) || (c.client_id || '').toLowerCase().includes(q);
      return matchSearch && (statusFilter === 'all' || statusOf(c) === statusFilter);
    });
  }, [clients, search, statusFilter, statusOf]);

  const unmarked = useMemo(() => clients.filter((c) => statusOf(c) === 'unmarked'), [clients, statusOf]);

  const mark = useCallback(async (client: Client, status: Status) => {
    const prev = recordMap.get(String(client.id));
    setSaving({ id: client.id, status });
    // Optimistic: the row changes under the thumb now, the server's copy
    // replaces it when the write lands, and the snapshot goes back if it does
    // not. A mark is payroll-adjacent, so it must never look silent.
    setRecords((rs) => [
      ...rs.filter((r) => String(r.ref_id) !== String(client.id)),
      {
        ...(prev ?? {}),
        ref_id: client.id,
        ref_name: client.name,
        date,
        status,
      },
    ]);
    try {
      await api.attendance.mark({
        type: 'client', ref_id: client.id, ref_name: client.name,
        trainer_id: client.trainer_id, trainer_name: client.trainer_name, date, status,
      });
      const fresh = await api.attendance.list({ date, type: 'client' });
      setRecords(fresh);
      const s = summarize(clients, fresh);
      setUndo({ client, prev, kind: 'mark', message: `${client.name} marked ${status}` });
      setAnnouncement(`${client.name} marked ${status}. ${s.checkedIn} of ${s.total} checked in.`);
    } catch (e: unknown) {
      setRecords((rs) => {
        const rest = rs.filter((r) => String(r.ref_id) !== String(client.id));
        return prev ? [...rest, prev] : rest;
      });
      toast.error(errorMessage(e, 'Failed to mark attendance'));
    } finally {
      setSaving(null);
    }
  }, [recordMap, date, clients, toast]);

  const clear = useCallback(async (client: Client) => {
    const prev = recordMap.get(String(client.id));
    if (!prev?.id) {
      toast.error('No record to clear');
      return;
    }
    setSaving({ id: client.id, status: 'unmarked' });
    setRecords((rs) => rs.filter((r) => String(r.ref_id) !== String(client.id)));
    try {
      await api.attendance.remove(prev.id);
      setRecords(await api.attendance.list({ date, type: 'client' }));
      setUndo({ client, prev, kind: 'clear', message: `Mark cleared for ${client.name}` });
      setAnnouncement(`${client.name}'s mark cleared.`);
    } catch (e: unknown) {
      setRecords((rs) => [...rs.filter((r) => String(r.ref_id) !== String(client.id)), prev]);
      toast.error(errorMessage(e, 'Failed to clear the mark'));
    } finally {
      setSaving(null);
    }
  }, [recordMap, date, toast]);

  const undoLast = useCallback(async () => {
    if (!undo) return;
    const { client, prev, kind } = undo;
    setUndo(null);
    setSaving({ id: client.id, status: 'unmarked' });
    try {
      // shortcut: the API cannot restore `method` (PUT has no such field), and
      // a deleted row cannot come back with its original id — undo restores the
      // values it does accept, and a cleared row returns as a manual entry.
      const restore = {
        type: 'client', ref_id: client.id, ref_name: client.name, date,
        status: prev?.status, check_in: hhmm(prev?.check_in), check_out: hhmm(prev?.check_out),
        notes: prev?.notes,
      };
      if (kind === 'clear' && prev) {
        await api.attendance.mark(restore);
      } else if (prev?.id) {
        await api.attendance.update(prev.id, {
          status: prev.status,
          check_in: prev.check_in ?? null,
          check_out: prev.check_out ?? null,
          notes: prev.notes ?? null,
        });
      } else if (prev) {
        await api.attendance.mark(restore);
      } else {
        const current = (await api.attendance.list({ date, type: 'client' }))
          .find((r) => String(r.ref_id) === String(client.id));
        if (current?.id) await api.attendance.remove(current.id);
      }
      setRecords(await api.attendance.list({ date, type: 'client' }));
      setAnnouncement('Change undone.');
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Could not undo'));
    } finally {
      setSaving(null);
    }
  }, [undo, date, toast]);

  // Five seconds to take a stray thumb back, then the bar gets out of the way.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  // An undo belongs to the day it happened on.
  useEffect(() => { setUndo(null); }, [date]);

  async function markAllPresent() {
    if (!unmarked.length) return;
    setMarkingAll(true);
    try {
      const res = await api.attendance.bulk(unmarked.map((c) => ({
        type: 'client', ref_id: c.id, ref_name: c.name, date, status: 'present',
      })));
      setRecords(await api.attendance.list({ date, type: 'client' }));
      if (res.failed) toast.error(`${res.processed} marked, ${res.failed} could not be`);
      else toast.success(`Marked ${res.processed} member${res.processed === 1 ? '' : 's'} present`);
      setAnnouncement(`Marked ${res.processed} member${res.processed === 1 ? '' : 's'} present.`);
      setUndo(null);
      setConfirmAll(false);
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Failed to mark all present'));
    } finally {
      setMarkingAll(false);
    }
  }

  function exportDay() {
    downloadCsv(dayCsv(clients, records, date), `attendance-${date}.csv`);
  }

  function exportRange() {
    downloadCsv(rangeCsv(rangeRecords), `attendance-${range}days-${today}.csv`);
  }

  const recent = useMemo(() => records
    .filter((r) => r.check_in && (r.status === 'present' || r.status === 'late'))
    .sort((a, b) => String(b.check_in).localeCompare(String(a.check_in)))
    .slice(0, 6), [records]);

  const attention = useMemo(() => buildAttention(summary, date === today), [summary, date, today]);

  const isToday = date === today;
  const dateLabel = dayLabel(date, today);
  const attentionCount = summary.unmarked + summary.absent + summary.late;

  return (
    <div className="relative min-h-screen">
      <PullToRefresh onRefresh={() => loadDay(true)}>
        <PageContainer>
          <PageHero
            compact
            title="Attendance"
            icon={<UserCheck size={20} aria-hidden />}
            surface={{
              background: [
                `radial-gradient(circle 240px at 8% 110%, ${attendanceMesh.glowA}, transparent 70%)`,
                `radial-gradient(circle 220px at 100% -10%, ${attendanceMesh.glowB}, transparent 70%)`,
                attendanceMesh.base,
              ].join(', '),
              shadow: attendanceMesh.shadow,
            }}
          >
            {activeTab === 'insights' ? (
              <p className="text-[12.5px] font-[650] text-white/90">Trends · last {range} days</p>
            ) : (
              <div className="text-white">
                <div className="flex items-center gap-3">
                  <RateRing rate={summary.rate} checkedIn={summary.checkedIn} total={summary.total} loading={loading} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-[800] leading-tight">
                      {loading ? '—' : summary.checkedIn} of {loading ? '—' : summary.total} checked in
                    </p>
                    <p className="mt-0.5 text-[11.5px] font-[650] text-white/90">
                      {loading ? 'Loading…' : `${summary.rate}% · ${isToday ? 'Today' : dateLabel}`}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <button type="button" aria-label="Previous day" onClick={() => setDate(shiftDay(date, -1))}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
                    style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <label className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-[800] focus-within:ring-2 focus-within:ring-white"
                    style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)' }}>
                    <CalendarDays size={15} aria-hidden className="shrink-0" />
                    <span className="truncate">{dateLabel}</span>
                    {/* The native picker, invisible over the chip, so tapping
                        the label opens the phone's own date wheel. The chip
                        carries the focus ring; the input itself is transparent. */}
                    <input aria-label="Attendance date" type="date" value={date} max={today}
                      onChange={(e) => e.target.value && setDate(e.target.value > today ? today : e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                  <button type="button" aria-label="Next day" onClick={() => setDate(shiftDay(date, 1))} disabled={isToday}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-white"
                    style={{ background: 'rgba(255,255,255,0.16)' }}>
                    <ChevronRight size={18} aria-hidden />
                  </button>
                  {!isToday && (
                    <button type="button" onClick={() => setDate(today)}
                      className="h-11 shrink-0 rounded-full px-3 text-[12.5px] font-[800]"
                      style={{ background: '#fff', color: palette.gray[900] }}>
                      Today
                    </button>
                  )}
                </div>
              </div>
            )}
          </PageHero>

          <PageActions className="mt-3">
            {activeTab === 'insights' ? (
              <Button variant="secondary" className="h-11" onClick={exportRange} iconLeft={<Download size={16} />}>
                Export range
              </Button>
            ) : (
              <>
                <Button className="h-11" onClick={() => setManualEntryOpen(true)} iconLeft={<Plus size={16} />}>
                  Add entry
                </Button>
                <Button variant="secondary" className="h-11" onClick={exportDay} iconLeft={<Download size={16} />}>
                  Export day
                </Button>
              </>
            )}
          </PageActions>

          <Segmented
            className="mt-3"
            idPrefix="att"
            ariaLabel="Attendance views"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: 'members', label: 'Register' },
              { id: 'insights', label: 'Trends' },
              { id: 'alerts', label: 'Attention', badge: attentionCount },
            ]}
          />

          <div className="mt-4">
            <div role="tabpanel" id="att-panel-members" aria-labelledby="att-tab-members" tabIndex={0} hidden={activeTab !== 'members'}>
              <MembersPanel
                summary={summary} loading={loading} dateLabel={dateLabel}
                filtered={filtered} total={clients.length}
                search={search} setSearch={setSearch}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                saving={saving} statusOf={statusOf} recordOf={(c) => recordMap.get(String(c.id))}
                mark={mark} clear={clear}
                onMarkAll={() => setConfirmAll(true)}
              />
              <RecentPanel recent={recent} clients={clients} isToday={isToday} />
            </div>
            <div role="tabpanel" id="att-panel-insights" aria-labelledby="att-tab-insights" tabIndex={0} hidden={activeTab !== 'insights'}>
              <InsightsPanel
                range={range} setRange={setRange} today={today} rosterSize={clients.length}
                rangeRecords={rangeRecords} rangeLoading={rangeLoading} monthlyRecords={monthlyRecords}
              />
            </div>
            <div role="tabpanel" id="att-panel-alerts" aria-labelledby="att-tab-alerts" tabIndex={0} hidden={activeTab !== 'alerts'}>
              <AlertsPanel alerts={attention} onView={(f) => { setStatusFilter(f); setActiveTab('members'); }} />
            </div>
          </div>
        </PageContainer>
      </PullToRefresh>

      {undo && (
        <div className="above-bottom-nav fixed inset-x-4 z-50 sm:inset-x-auto sm:right-6 sm:w-[380px]">
          <div role="status" className="flex items-center gap-2 rounded-[16px] px-3 py-2.5 shadow-[var(--shadow-xl)]"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>
            <p className="min-w-0 flex-1 text-[13px] font-[700]">{undo.message}</p>
            <button type="button" onClick={undoLast}
              className="h-11 shrink-0 rounded-[10px] px-3 text-[13px] font-[800] text-white"
              style={{ background: 'var(--brand)' }}>
              Undo
            </button>
            <button type="button" aria-label="Dismiss undo" onClick={() => setUndo(null)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] hover:bg-white/10">
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <ManualEntryModal
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        clients={clients}
        date={date}
        onSuccess={() => loadDay(true)}
      />

      <Dialog open={confirmAll} onOpenChange={(o) => !markingAll && setConfirmAll(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {unmarked.length} member{unmarked.length === 1 ? '' : 's'} present?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Everyone still unmarked for {isToday ? 'today' : dateLabel} is recorded as present.
            Members already marked keep their status. You can clear or change any of them afterwards.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAll(false)} disabled={markingAll}>Cancel</Button>
            <Button onClick={markAllPresent} loading={markingAll}>Mark present</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** The 'HH:MM' the API's POST accepts, from the ISO instant the GET returns. */
function hhmm(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  if (!iso.includes('T')) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The range CSV: one row per record in the window. */
function rangeCsv(records: Attendance[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) => [String(r.date ?? '').slice(0, 10), r.ref_name ?? r.ref_id, r.status, clockTime(r.check_in) ?? '', clockTime(r.check_out) ?? '', r.method ?? '']);
  return [['Date', 'Member', 'Status', 'Check-in', 'Check-out', 'Method'], ...rows].map((row) => row.map(esc).join(',')).join('\n');
}

/** The day's rate ring: the share of the roster that came in. */
function RateRing({ rate, checkedIn, total, loading, size = 96 }: {
  rate: number; checkedIn: number; total: number; loading: boolean; size?: number;
}) {
  const stroke = Math.max(8, Math.round(size / 8));
  const r = (size - stroke) / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={loading ? 'Loading' : `${checkedIn} of ${total} members in, ${rate}%`}>
        <defs>
          <linearGradient id="att-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ringStops[0]} />
            <stop offset="55%" stopColor={ringStops[1]} />
            <stop offset="100%" stopColor={ringStops[2]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <m.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#att-ring)" strokeWidth={stroke}
          strokeLinecap="round" pathLength={100} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDasharray: '0 100' }}
          animate={{ strokeDasharray: `${loading ? 0 : rate} 100` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[850] leading-none tabular-nums tracking-[-0.03em]" style={{ fontSize: size <= 72 ? 16 : 22 }}>
          {loading ? '—' : `${rate}%`}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATUS TILES
──────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────
   STATUS STRIP — the day at a glance, not a second set of filters
──────────────────────────────────────────────────────────────── */
function StatusStrip({ summary, loading }: { summary: DaySummary; loading: boolean }) {
  return (
    <dl className="grid grid-cols-4 gap-2" aria-label="Day summary">
      {(['present', 'late', 'absent', 'unmarked'] as const).map((s) => {
        const st = STATUS[s];
        return (
          <div key={s} className="rounded-[14px] px-2 py-2 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <dt className="flex items-center justify-center gap-1 text-[11px] font-[750] uppercase tracking-[0.03em]"
              style={{ color: 'var(--text-muted)' }}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: st.color }} />
              {st.label}
            </dt>
            <dd className="mt-1 text-[18px] font-[850] leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {loading ? '—' : summary[s]}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL — a real tablist, with arrow keys
──────────────────────────────────────────────────────────────── */
function Segmented<T extends string>({ value, onChange, options, className = '', idPrefix, ariaLabel }: {
  value: T; onChange: (v: T) => void; className?: string; idPrefix: string; ariaLabel: string;
  options: { id: T; label: string; badge?: number }[];
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % options.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = options.length - 1;
    onChange(options[next].id);
    refs.current[options[next].id]?.focus();
  }
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex gap-1 rounded-[18px] p-1.5 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {options.map((o, i) => {
        const on = value === o.id;
        return (
          <button key={o.id} type="button" role="tab" id={`${idPrefix}-tab-${o.id}`}
            aria-selected={on} aria-controls={`${idPrefix}-panel-${o.id}`}
            tabIndex={on ? 0 : -1}
            ref={(el) => { refs.current[o.id] = el; }}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.id)}
            className="relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[13px] text-[13.5px] font-[780] transition-colors"
            style={{ color: on ? '#fff' : 'var(--text-secondary)' }}>
            {on && (
              <m.span layoutId="att-tab" aria-hidden className="absolute inset-0 rounded-[13px]"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                style={{ background: gradient(tones.indigo), boxShadow: `0 8px 18px -10px ${tones.indigo.glow}` }} />
            )}
            <span className="relative">{o.label}</span>
            {!!o.badge && (
              <span className="relative grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-[850] tabular-nums"
                style={{ background: on ? 'rgba(255,255,255,0.3)' : 'var(--bg-subtle)', color: on ? '#fff' : 'var(--text-secondary)' }}>
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MEMBERS
──────────────────────────────────────────────────────────────── */
function MembersPanel({
  summary, loading, dateLabel, filtered, total, search, setSearch,
  statusFilter, setStatusFilter, saving, statusOf, recordOf, mark, clear, onMarkAll,
}: {
  summary: DaySummary; loading: boolean; dateLabel: string;
  filtered: Client[]; total: number;
  search: string; setSearch: (v: string) => void;
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
  saving: { id: string; status: Status } | null;
  statusOf: (c: Client) => Status;
  recordOf: (c: Client) => Attendance | undefined;
  mark: (c: Client, s: Status) => Promise<void>;
  clear: (c: Client) => Promise<void>;
  onMarkAll: () => void;
}) {
  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'unmarked', label: 'Unmarked' },
    { id: 'present', label: 'Present' }, { id: 'late', label: 'Late' }, { id: 'absent', label: 'Absent' },
  ];
  return (
    <div className="space-y-3.5">
      <StatusStrip summary={summary} loading={loading} />
      {summary.offRoster > 0 && (
        <p className="px-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
          {summary.offRoster} record{summary.offRoster === 1 ? '' : 's'} on this day for member{summary.offRoster === 1 ? '' : 's'} not on the active roster.
        </p>
      )}

      {/* The day stays on screen while the register scrolls. */}
      <div className="below-topbar sticky z-30 flex items-center gap-2 rounded-[16px] px-3 py-2 shadow-[var(--shadow-sm)]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>{dateLabel}</p>
          <p className="text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            {summary.total} member{summary.total === 1 ? '' : 's'} · {summary.checkedIn} checked in
          </p>
        </div>
        {!loading && summary.unmarked > 0 && (
          <button type="button" onClick={onMarkAll}
            className="h-11 shrink-0 rounded-[12px] px-3 text-[12.5px] font-[800] text-white"
            style={{ background: 'var(--brand)' }}>
            Mark {summary.unmarked} present
          </button>
        )}
      </div>

      <Card>
        <CardBody className="p-4 sm:p-5">
          <SearchField label="Search members" value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const on = statusFilter === f.id;
              const color = f.id === 'all' ? gradient(tones.indigo) : STATUS[f.id as Status].ink;
              return (
                <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)} aria-pressed={on}
                  className="h-11 shrink-0 rounded-full px-3 text-[12.5px] font-[750] transition-colors"
                  style={on
                    ? { background: color, color: '#fff' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[116px] animate-pulse rounded-[18px] sm:h-[76px]" style={{ background: 'var(--bg-subtle)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center rounded-[20px] px-6 py-10 text-center" style={{ background: 'var(--bg-subtle)' }}>
                <span className="grid h-12 w-12 place-items-center rounded-[15px] text-white" style={{ background: gradient(tones.indigo) }}>
                  <Users size={22} aria-hidden />
                </span>
                <p className="mt-3 text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>
                  {total === 0 ? 'No active members yet' : 'Nobody matches'}
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  {total === 0 ? 'Active clients appear here to be marked.' : 'Try another search or filter.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((c) => (
                  <MemberRow key={c.id} client={c} status={statusOf(c)} record={recordOf(c)}
                    saving={saving} mark={mark} clear={clear} dateLabel={dateLabel} />
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR', manual: 'Manual', face: 'Face', face_id: 'Face ID', fingerprint: 'Fingerprint', touch_id: 'Touch ID', passkey: 'Passkey', biometric: 'Biometric',
};

function StatusButtons({ client, status, saving, mark, clear, dateLabel, className = '' }: {
  client: Client; status: Status;
  saving: { id: string; status: Status } | null;
  mark: (c: Client, s: Status) => Promise<void>;
  clear: (c: Client) => Promise<void>;
  dateLabel: string;
  className?: string;
}) {
  const busy = !!saving;
  return (
    <div role="group" aria-label={`Status for ${client.name} on ${dateLabel}`} className={`flex items-center gap-1 ${className}`}>
      {(['present', 'late', 'absent'] as const).map((k) => {
        const on = status === k;
        const c = STATUS[k];
        const pending = saving?.id === client.id && saving.status === k;
        return (
          <button key={k} type="button" onClick={() => !on && mark(client, k)} disabled={busy}
            aria-pressed={on} aria-label={`${c.label} for ${client.name}`} title={c.label}
            className={`grid h-11 min-w-11 flex-1 place-items-center rounded-[10px] text-[13px] font-[850] transition-colors disabled:opacity-60 sm:flex-none ${on ? 'cursor-default' : ''}`}
            style={on ? { background: c.ink, color: '#fff' } : { color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}>
            {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : c.short}
          </button>
        );
      })}
      <button type="button" onClick={() => clear(client)} disabled={busy || status === 'unmarked'}
        aria-label={`Clear mark for ${client.name}`} title="Clear mark"
        className="grid h-11 min-w-11 flex-1 place-items-center rounded-[10px] transition-colors hover:text-[var(--text-primary)] disabled:opacity-35 sm:flex-none"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}>
        {saving?.id === client.id && saving.status === 'unmarked'
          ? <Loader2 size={14} className="animate-spin" aria-hidden />
          : <RotateCcw size={15} aria-hidden />}
      </button>
    </div>
  );
}

const MemberRow = React.memo(function MemberRow({ client, status, record, saving, mark, clear, dateLabel }: {
  client: Client; status: Status; record: Attendance | undefined;
  saving: { id: string; status: Status } | null;
  mark: (c: Client, s: Status) => Promise<void>;
  clear: (c: Client) => Promise<void>;
  dateLabel: string;
}) {
  const s = STATUS[status];
  const time = clockTime(record?.check_in);
  const method = record?.method ? METHOD_LABEL[record.method] ?? record.method : null;
  const markedAt = status === 'absent' ? clockTime(record?.created_at) : null;
  const audit = status === 'unmarked'
    ? 'Not marked'
    : [s.label, time, method].filter(Boolean).join(' · ');
  return (
    <li className="rounded-[18px] p-2.5"
      style={{ background: status === 'unmarked' ? 'var(--bg-subtle)' : rgba(s.color, 0.07), border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-full p-[2.5px]" style={{ background: status === 'unmarked' ? 'var(--border)' : s.color }}>
          <ClientAvatar name={client.name} photoUrl={client.photo_url}
            className="grid h-11 w-11 place-items-center rounded-full text-[13px] font-[800] text-white"
            style={{ background: gradient(tones.indigo), border: '2px solid var(--bg-card)' }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
            {audit}
            {markedAt && <> · Marked {markedAt}</>}
          </p>
        </div>
        {/* Desktop keeps the status on the row; a phone gives it the full
            width underneath, where four 44px targets actually fit. */}
        <StatusButtons client={client} status={status} saving={saving} mark={mark} clear={clear}
          dateLabel={dateLabel} className="hidden shrink-0 sm:flex" />
      </div>
      <StatusButtons client={client} status={status} saving={saving} mark={mark} clear={clear}
        dateLabel={dateLabel} className="mt-2 sm:hidden" />
    </li>
  );
});
/* ────────────────────────────────────────────────────────────────
   RECENT CHECK-INS
──────────────────────────────────────────────────────────────── */
function RecentPanel({ recent, clients, isToday }: { recent: Attendance[]; clients: Client[]; isToday: boolean }) {
  const byId = useMemo(() => new Map(clients.map((c) => [String(c.id), c])), [clients]);
  return (
    <Card className="mt-4">
      <CardHeader className="px-4 py-3 sm:px-5">
        <SectionTitle icon={<UserCheck size={16} />} tone="aqua" title="Just checked in" />
        <Link href="/checkin/qr-scanner" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[780] text-white"
          style={{ background: gradient(tones.aqua) }}>
          <QrCode size={14} aria-hidden /> Scanner
        </Link>
      </CardHeader>
      <CardBody className="px-4 py-4 sm:px-5">
        {recent.length === 0 ? (
          <p className="rounded-[16px] px-4 py-6 text-center text-[13px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            No check-ins {isToday ? 'yet today' : 'that day'}.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recent.map((r) => {
              const c = byId.get(String(r.ref_id));
              const s = STATUS[r.status === 'late' ? 'late' : 'present'];
              return (
                <li key={r.id ?? `${r.ref_id}`} className="flex items-center gap-3 rounded-[16px] p-2.5" style={{ background: 'var(--bg-subtle)' }}>
                  <span className="shrink-0 rounded-full p-[2px]" style={{ background: s.color }}>
                    <ClientAvatar name={c?.name ?? r.ref_name} photoUrl={c?.photo_url}
                      className="grid h-10 w-10 place-items-center rounded-full text-[12px] font-[800] text-white"
                      style={{ background: gradient(tones.aqua), border: '2px solid var(--bg-card)' }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{c?.name ?? r.ref_name ?? 'Member'}</p>
                    <p className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                      {clockTime(r.check_in)}{r.method ? ` · ${METHOD_LABEL[r.method] ?? r.method}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>{ago(r.check_in)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function SectionTitle({ icon, tone, title, subtitle }: { icon: React.ReactNode; tone: ToneName; title: string; subtitle?: string }) {
  const t = tones[tone];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white"
        style={{ background: gradient(t), boxShadow: `0 6px 16px -6px ${t.glow}` }}>{icon}</span>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-[800] tracking-[-0.015em]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   TRENDS (the Insights tab)
──────────────────────────────────────────────────────────────── */
function InsightsPanel({ range, setRange, today, rosterSize, rangeRecords, rangeLoading, monthlyRecords }: {
  range: string; setRange: (r: string) => void; today: string; rosterSize: number;
  rangeRecords: Attendance[]; rangeLoading: boolean; monthlyRecords: Attendance[];
}) {
  // The daily chart is always the last seven days — a 90-bar chart on a phone
  // is a barcode. The range picker drives the figures around it.
  const week = useMemo(() => {
    const w = lastDays(7, today);
    return dailySeries(rangeRecords, w.from, w.to, rosterSize);
  }, [rangeRecords, today, rosterSize]);
  const hours = useMemo(() => peakHours(rangeRecords), [rangeRecords]);
  const max = Math.max(...week.map((p) => p.checkedIn), 1);

  return (
    <div className="space-y-4">
      <RangeBar range={range} setRange={setRange} />
      <p className="px-1 text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
        Figures below cover the last {range} days; the daily chart always shows the last 7.
      </p>
      <RangeKpis records={rangeRecords} loading={rangeLoading} />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <SectionTitle icon={<BarChart3 size={16} />} tone="indigo" title="Weekly attendance"
              subtitle="Members in each day, last 7 days" />
          </CardHeader>
          <CardBody className="px-4 py-4 sm:px-5">
            <div className="flex h-48 items-end gap-2">
              {week.map((p, i) => (
                <div key={p.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[12px] font-[800] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {rangeLoading ? '' : p.checkedIn}
                  </span>
                  <m.div className="w-full max-w-[44px] rounded-[10px]"
                    style={{ background: p.date === today ? gradient(tones.aqua, 180) : barGradient, minHeight: 6 }}
                    initial={{ height: 6 }}
                    animate={{ height: rangeLoading ? 6 : `${Math.max(4, (p.checkedIn / max) * 100)}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }} />
                  <span className="text-[12px] font-[700]" style={{ color: p.date === today ? tones.aqua.ink : 'var(--text-muted)' }}>
                    {p.date === today ? 'Today' : p.label}
                  </span>
                </div>
              ))}
            </div>
            {rosterSize > 0 && (
              <p className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Out of {rosterSize} active member{rosterSize === 1 ? '' : 's'} today.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 sm:px-5">
            <SectionTitle icon={<Clock size={16} />} tone="sunset" title="Peak hours" subtitle={`When members come in · last ${range} days`} />
          </CardHeader>
          <CardBody className="px-4 py-4 sm:px-5">
            <div className="space-y-2.5">
              {hours.map((h) => (
                <div key={h.label} className="flex items-center gap-3">
                  <p className="w-[92px] shrink-0 text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{h.label}</p>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <m.div className="h-full rounded-full" style={{ background: gradient(tones.sunset, 90) }}
                      initial={{ width: 0 }} animate={{ width: `${h.share}%` }} transition={{ duration: 0.6, ease: EASE }} />
                  </div>
                  <p className="w-7 text-right text-[12px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{h.count}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <MethodBreakdown records={rangeRecords} range={range} />
      <MonthlySummary records={monthlyRecords} />
    </div>
  );
}

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
];

function RangeBar({ range, setRange }: { range: string; setRange: (r: string) => void }) {
  return (
    <div role="group" aria-label="Date range" className="grid grid-cols-3 gap-1 rounded-full p-1"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {RANGES.map((r) => {
        const on = range === r.id;
        return (
          <button key={r.id} type="button" aria-pressed={on} onClick={() => setRange(r.id)}
            className="h-11 truncate rounded-full px-2 text-[13px] font-[750] transition-colors"
            style={on ? { background: gradient(tones.indigo), color: '#fff' } : { color: 'var(--text-secondary)' }}>
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
const RANGE_KPIS = [
  { key: 'visits', label: 'Check-ins', tone: 'indigo' },
  { key: 'present', label: 'Present', status: 'present' },
  { key: 'late', label: 'Late', status: 'late' },
  { key: 'absent', label: 'Absent', status: 'absent' },
] as const;

function RangeKpis({ records, loading }: { records: Attendance[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {RANGE_KPIS.map((k) => {
        // A check-in is a present or late row; absences are records of NOT
        // coming in and were once counted here as visits.
        const value = k.key === 'visits'
          ? records.filter((r) => r.status === 'present' || r.status === 'late').length
          : records.filter((r) => r.status === k.key).length;
        const color = 'status' in k ? STATUS[k.status].color : tones.indigo.from;
        return (
          <div key={k.key} className="rounded-[20px] p-4"
            style={{ background: `radial-gradient(140px circle at 100% 0%, ${rgba(color, 0.14)}, transparent 70%), var(--bg-card)`, border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            {loading
              ? <div className="mt-2 h-7 w-12 animate-pulse rounded-md" style={{ background: 'var(--bg-subtle)' }} />
              : <p className="mt-1.5 text-[26px] font-[850] leading-none tabular-nums" style={{ color }}>{value}</p>}
          </div>
        );
      })}
    </div>
  );
}

const METHOD_TONE: Record<string, ToneName> = {
  qr: 'aqua', manual: 'indigo', face: 'berry', face_id: 'berry', fingerprint: 'gold', touch_id: 'gold', passkey: 'sky', biometric: 'sunset',
};

function MethodBreakdown({ records, range }: { records: Attendance[]; range: string }) {
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of records) {
      if (r.status !== 'present' && r.status !== 'late') continue;
      const mth = r.method || 'manual';
      acc[mth] = (acc[mth] || 0) + 1;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [records]);

  if (counts.length === 0) return null;
  const total = counts.reduce((n, [, c]) => n + c, 0) || 1;

  return (
    <Card>
      <CardHeader className="px-4 py-3 sm:px-5">
        <SectionTitle icon={<QrCode size={16} />} tone="aqua" title="Check-in methods" subtitle={`Last ${range} days`} />
      </CardHeader>
      <CardBody className="px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {counts.map(([method, count]) => {
            const t = tones[METHOD_TONE[method] ?? 'indigo'];
            const pct = Math.round((count / total) * 100);
            return (
              <div key={method} className="rounded-[16px] p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="truncate text-[12px] font-[700]" style={{ color: 'var(--text-secondary)' }}>{METHOD_LABEL[method] ?? method}</p>
                <p className="mt-1 text-[22px] font-[850] tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{count}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: gradient(t, 90) }} />
                </div>
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{pct}% of check-ins</p>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function MonthlySummary({ records }: { records: Attendance[] }) {
  const rows = useMemo(() => {
    const byMonth: Record<string, { checkins: number; members: Set<string>; present: number; days: Set<string> }> = {};
    for (const r of records) {
      if (r.status !== 'present' && r.status !== 'late') continue;
      const date = String(r.date || '').slice(0, 10);
      const key = date.slice(0, 7);
      if (!key) continue;
      byMonth[key] ??= { checkins: 0, members: new Set(), present: 0, days: new Set() };
      byMonth[key].checkins++;
      byMonth[key].members.add(String(r.ref_id));
      byMonth[key].days.add(date);
      if (r.status === 'present') byMonth[key].present++;
    }
    return Object.entries(byMonth).sort().reverse().slice(0, 6).map(([month, d]) => ({
      month,
      label: new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      checkins: d.checkins,
      members: d.members.size,
      // Per DAY the studio was open, not per record — the version this came
      // from divided the month's check-ins by the number of records in that
      // month, which is checkins/checkins and prints 1 for every month.
      avgDaily: Math.round(d.checkins / Math.max(d.days.size, 1)),
      onTime: Math.round((d.present / Math.max(d.checkins, 1)) * 100),
    }));
  }, [records]);

  return (
    <Card>
      <CardHeader className="px-4 py-3 sm:px-5">
        <SectionTitle icon={<CalendarDays size={16} />} tone="sky" title="Monthly summary" subtitle="Last 6 months" />
      </CardHeader>
      <CardBody className="px-4 py-4 sm:px-5">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>No monthly data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.month} className="rounded-[16px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                  <p className="text-[14px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {r.checkins}
                    <span className="ml-1 text-[12px] font-[700]" style={{ color: 'var(--text-muted)' }}>check-ins</span>
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.members}</b> members</span>
                  {/* Per day the studio was actually open: dividing by every
                      calendar day in the month understated a studio that
                      closes on Sundays. */}
                  <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.avgDaily}</b> avg/active day</span>
                  <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.onTime}%</b> on time</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────
   ATTENTION — what needs a trainer, from the day's own figures
──────────────────────────────────────────────────────────────── */
type AttentionItem = { key: string; title: string; desc?: string; status: Status };

function buildAttention(s: DaySummary, isToday: boolean): AttentionItem[] {
  const out: AttentionItem[] = [];
  const day = isToday ? 'today' : 'that day';
  // Only the unmarked case carries a description: what to do about it is not
  // inferable from the count. "Worth a message" and "Marked late on the
  // register" restated the title or the CTA beside them.
  if (s.unmarked > 0) out.push({ key: 'unmarked', status: 'unmarked', title: `${s.unmarked} not marked ${day}`, desc: 'No check-in and no mark yet. Mark them, or scan them in as they arrive.' });
  if (s.absent > 0) out.push({ key: 'absent', status: 'absent', title: `${s.absent} marked absent` });
  if (s.late > 0) out.push({ key: 'late', status: 'late', title: `${s.late} arrived late` });
  return out;
}

function AlertsPanel({ alerts, onView }: { alerts: AttentionItem[]; onView: (f: StatusFilter) => void }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardBody className="px-4 py-8 sm:px-5">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-[18px] text-white" style={{ background: gradient(tones.aqua) }}>
              <CheckCircle2 size={26} aria-hidden />
            </span>
            <p className="mt-3 text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>All clear</p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Everyone is marked.</p>
          </div>
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((a) => {
        const s = STATUS[a.status];
        return (
          <Card key={a.key}>
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-white" style={{ background: s.ink }}>
                  {a.status === 'unmarked' ? <AlertTriangle size={18} aria-hidden /> : <s.Icon size={18} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                  {a.desc && <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>}
                </div>
              </div>
              <button type="button" onClick={() => onView(a.status)}
                className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-[780]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                View members <ArrowRight size={13} aria-hidden />
              </button>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MANUAL ENTRY MODAL
──────────────────────────────────────────────────────────────── */
function ManualEntryModal({ open, onOpenChange, clients, date, onSuccess }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  clients: Client[]; date: string; onSuccess: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [memberError, setMemberError] = useState('');

  const f = useAppForm({
    schema: attendanceEntrySchema,
    defaultValues: blankAttendanceEntry(date),
    onSubmit: async (values: AttendanceEntryValues) => {
      // `selectedClient` is checked before submit, so this is a type narrowing
      // rather than a guard — the button is disabled without one.
      const client = selectedClient!;
      await api.attendance.mark({
        type:         'client',
        ref_id:       client.id,
        ref_name:     client.name,
        trainer_id:   client.trainer_id,
        trainer_name: client.trainer_name,
        date:         values.entryDate as string,
        // Omitted rather than sent empty: the server concatenates it into a
        // timestamp and `new Date('…T')` is an Invalid Date.
        check_in:     values.checkIn ?? undefined,
        status:       values.status as string,
        notes:        values.notes ?? undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
  });

  const entryDate = useStore(f.form.store, (st) => String(st.values.entryDate ?? ''));
  const futureDate = attendanceDateIssue(entryDate, date);

  useEffect(() => {
    if (open) {
      // One reset, from the record, rather than seven setters — and `resetTo`
      // also clears the errors and the success flag, so a red message from the
      // previous correction cannot survive onto this one (§11).
      setQuery('');
      setSelectedClient(null);
      setMemberError('');
      f.resetTo(blankAttendanceEntry(date));
    }
    // `f` is stable across renders; depending on it would reset the form on
    // every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const filteredClients = useMemo(() => {
    if (!query) return clients.slice(0, 8);
    return clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }, [clients, query]);

  function handleSubmit() {
    if (!selectedClient) { setMemberError('Select a member'); return; }
    setMemberError('');
    f.submit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div role="group" aria-labelledby="atd-member-label">
            <span id="atd-member-label" className="text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>Member</span>
            {selectedClient ? (
              <div className="mt-1.5 flex min-h-11 items-center justify-between gap-2 rounded-[12px] px-3 py-2"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <span className="min-w-0 truncate text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{selectedClient.name}</span>
                <button type="button" onClick={() => setSelectedClient(null)}
                  className="h-11 shrink-0 rounded-[10px] px-2 text-[12.5px] font-[700]"
                  style={{ color: 'var(--text-muted)' }}>Change</button>
              </div>
            ) : (
              <>
                {/* A search box whose input has no visible label — the label
                    is hidden but still associated, so the control keeps its
                    name after the user types. */}
                <SearchField
                  label="Search member"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  fieldClassName="mt-1.5"
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded-[12px]" style={{ border: '1px solid var(--border)' }}>
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No members found</p>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClient(c)}
                      className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--bg-hover)]"
                    >
                      <span className="min-w-0 truncate text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                      <span className="shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>{c.mobile || ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <f.form.Field name="entryDate">
              {(field) => (
                <DateFieldControl
                  field={field} label="Date" required density="compact"
                  // A browser hint, not the rule — `attendanceDateIssue` below
                  // is what actually refuses a future date, because a date
                  // input's `max` can be bypassed and a correction filed for a
                  // day that has not happened is not a correction.
                  max={date}
                  serverError={futureDate ?? f.errors.fieldErrors.entryDate}
                />
              )}
            </f.form.Field>
            <f.form.Field name="checkIn">
              {(field) => (
                <TimeFieldControl
                  field={field} label="Check-in time" density="compact"
                  serverError={f.errors.fieldErrors.checkIn}
                />
              )}
            </f.form.Field>
          </div>

          {/* A three-way choice rendered as buttons.
              It stays a `role="group"` of toggle buttons rather than becoming
              a ChoiceChips, for two reasons. The status colours are the point
              here — amber for late, and the row it writes is read back in
              those same colours — and a generic chip row would flatten them to
              one accent. And `role="radiogroup"` is not a free upgrade: it
              obliges a roving tabindex and arrow-key navigation, and declaring
              one without implementing them is worse than an honest group.
              `aria-pressed` is the correct, complete semantics for a toggle
              button, and it says which one is chosen. */}
          <div>
            <span id="atd-status-label" className="text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>Status</span>
            <f.form.Field name="status">
              {(field) => (
                <div role="group" aria-labelledby="atd-status-label" className="mt-1.5 flex gap-2">
                  {ATTENDANCE_STATUSES.map(s => {
                    const on = field.state.value === s;
                    return (
                      <button key={s} type="button" aria-pressed={on}
                        onClick={() => field.handleChange(s)}
                        className="min-h-11 flex-1 rounded-[10px] border px-3 py-2 text-[12.5px] font-[750] capitalize transition"
                        style={on
                          ? { background: STATUS[s].ink, borderColor: STATUS[s].ink, color: '#fff' }
                          : { background: 'var(--bg-card)', borderColor: 'var(--border-2)', color: 'var(--text-secondary)' }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </f.form.Field>
          </div>

          <f.form.Field name="notes">
            {(field) => (
              <TextAreaField
                field={field} label="Notes (optional)" density="compact" rows={2}
                maxLength={500}
                serverError={f.errors.fieldErrors.notes}
              />
            )}
          </f.form.Field>

          {memberError && <p className="text-[12.5px] font-[650]" style={{ color: 'var(--danger-text)' }}>{memberError}</p>}
          <FormErrorBanner errors={f.errors} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={f.isSubmitting} disabled={!selectedClient || !!futureDate || f.isSubmitting}>Save Entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

