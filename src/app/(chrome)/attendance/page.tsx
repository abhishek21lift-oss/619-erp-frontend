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

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, Loader2, Plus, QrCode, Search, Sparkles, UserCheck, UserX, Users,
} from 'lucide-react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import {
  PullToRefresh, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, PageContainer, PageHero, SearchField,
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

const STATUS: Record<Status, { label: string; short: string; color: string; Icon: typeof UserCheck }> = {
  present:  { label: 'Present',  short: 'P', color: palette.emerald[500], Icon: UserCheck },
  late:     { label: 'Late',     short: 'L', color: palette.amber[500],   Icon: Clock },
  absent:   { label: 'Absent',   short: 'A', color: palette.red[500],     Icon: UserX },
  unmarked: { label: 'Unmarked', short: '–', color: palette.gray[400],    Icon: Users },
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
  const [saving, setSaving] = useState<string | null>(null);
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

  const mark = useCallback(async (client: Client, status: string) => {
    setSaving(client.id);
    try {
      await api.attendance.mark({
        type: 'client', ref_id: client.id, ref_name: client.name,
        trainer_id: client.trainer_id, trainer_name: client.trainer_name, date, status,
      });
      setRecords(await api.attendance.list({ date, type: 'client' }));
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Failed to mark attendance'));
    } finally {
      setSaving(null);
    }
  }, [date, toast]);

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

  const recent = useMemo(() => records
    .filter((r) => r.check_in && (r.status === 'present' || r.status === 'late'))
    .sort((a, b) => String(b.check_in).localeCompare(String(a.check_in)))
    .slice(0, 6), [records]);

  const attention = useMemo(() => buildAttention(summary, date === today), [summary, date, today]);

  return (
    <div className="relative min-h-screen">
      <PullToRefresh onRefresh={() => loadDay(true)}>
        <PageContainer>
          <AttendanceHero
            date={date} today={today} setDate={setDate} summary={summary} loading={loading}
            onManualEntry={() => setManualEntryOpen(true)}
            onExport={exportDay}
            onGenerateReport={() => setActiveTab('insights')}
          />

          {/* ── Status tiles: tap to filter the list ── */}
          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today by status">
            {(['present', 'late', 'absent', 'unmarked'] as const).map((s, i) => (
              <StatusTile key={s} status={s} value={summary[s]} total={summary.total} loading={loading}
                active={statusFilter === s} delay={i * 0.04}
                onClick={() => { setStatusFilter(statusFilter === s ? 'all' : s); setActiveTab('members'); }} />
            ))}
          </section>

          {/* ── Mark the rest ── */}
          {!loading && unmarked.length > 0 && (
            <m.button
              type="button"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
              onClick={() => setConfirmAll(true)}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] text-[14px] font-[800] text-white transition-transform active:scale-[0.99]"
              style={{ background: gradient(tones.aqua), boxShadow: `0 14px 30px -14px ${tones.aqua.glow}` }}
            >
              <CheckCircle2 size={17} aria-hidden />
              Mark {unmarked.length} unmarked present
            </m.button>
          )}

          {/* ── Tabs ── */}
          <Segmented
            className="mt-5"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { id: 'members', label: 'Members', tone: 'indigo' },
              { id: 'insights', label: 'Trends', tone: 'berry' },
              { id: 'alerts', label: 'Attention', tone: 'sunset', badge: attention.length },
            ]}
          />

          <div className="mt-4">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'members' && (
                <m.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                  <MembersPanel
                    filtered={filtered} loading={loading} total={clients.length}
                    search={search} setSearch={setSearch}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    saving={saving} statusOf={statusOf} recordOf={(c) => recordMap.get(String(c.id))} mark={mark}
                  />
                  {date === today && <RecentPanel recent={recent} clients={clients} />}
                </m.div>
              )}
              {activeTab === 'insights' && (
                <m.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                  <InsightsPanel
                    range={range} setRange={setRange} today={today} rosterSize={clients.length}
                    rangeRecords={rangeRecords} rangeLoading={rangeLoading} monthlyRecords={monthlyRecords}
                    onExport={() => downloadCsv(rangeCsv(rangeRecords), `attendance-${range}days-${today}.csv`)}
                  />
                </m.div>
              )}
              {activeTab === 'alerts' && (
                <m.div key="alerts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                  <AlertsPanel alerts={attention} onView={(f) => { setStatusFilter(f); setActiveTab('members'); }} />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </PageContainer>
      </PullToRefresh>

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
            Everyone still unmarked for {dayLabel(date, today).toLowerCase() === 'today' ? 'today' : dayLabel(date, today)} is recorded as present.
            Members already marked keep their status. You can change any of them afterwards.
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

/** The range CSV: one row per record in the window. */
function rangeCsv(records: Attendance[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map((r) => [String(r.date ?? '').slice(0, 10), r.ref_name ?? r.ref_id, r.status, clockTime(r.check_in) ?? '', clockTime(r.check_out) ?? '', r.method ?? '']);
  return [['Date', 'Member', 'Status', 'Check-in', 'Check-out', 'Method'], ...rows].map((row) => row.map(esc).join(',')).join('\n');
}

/* ────────────────────────────────────────────────────────────────
   HERO — the day, and how much of the roster has come in
──────────────────────────────────────────────────────────────── */
function AttendanceHero({ date, today, setDate, summary, loading, onManualEntry, onExport, onGenerateReport }: {
  date: string; today: string; setDate: (d: string) => void;
  summary: DaySummary; loading: boolean;
  onManualEntry: () => void; onExport: () => void; onGenerateReport: () => void;
}) {
  const isToday = date === today;
  return (
    <PageHero
      title="Attendance"
      subtitle="Mark the day, correct a record, see who is turning up."
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
      <div className="text-white">
        {/* The ring and what it counts. */}
        <div className="flex items-center gap-4">
          <RateRing rate={summary.rate} checkedIn={summary.checkedIn} total={summary.total} loading={loading} />
          <div className="min-w-0 flex-1">
            <p className="text-[28px] font-[850] leading-none tabular-nums tracking-[-0.03em]">
              {loading ? '—' : summary.checkedIn}
              <span className="ml-1.5 text-[15px] font-[700] text-white/70">of {loading ? '—' : summary.total} in</span>
            </p>
            <p className="mt-1.5 text-[12.5px] font-[650] text-white/75">
              {isToday ? 'Checked in today' : `Checked in · ${dayLabel(date, today)}`}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(['present', 'late', 'absent'] as const).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-[750]"
                  style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS[k].color }} />
                  {loading ? '—' : summary[k]} {STATUS[k].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* The date strip: step a day, or pick one. */}
        <div className="mt-4 flex items-center gap-2">
          <button type="button" aria-label="Previous day" onClick={() => setDate(shiftDay(date, -1))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20"
            style={{ background: 'rgba(255,255,255,0.14)' }}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <label className="relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[14px] font-[800] sm:w-[260px] sm:flex-none"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
            <CalendarDays size={15} aria-hidden className="shrink-0 opacity-85" />
            <span className="truncate">{dayLabel(date, today)}</span>
            {/* The native picker, invisible over the chip, so tapping the
                label opens the phone's own date wheel. */}
            <input aria-label="Attendance date" type="date" value={date} max={today}
              onChange={(e) => e.target.value && setDate(e.target.value > today ? today : e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0" style={{ colorScheme: 'dark' }} />
          </label>
          <button type="button" aria-label="Next day" onClick={() => setDate(shiftDay(date, 1))} disabled={isToday}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-35"
            style={{ background: 'rgba(255,255,255,0.14)' }}>
            <ChevronRight size={18} aria-hidden />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDate(today)}
              className="h-11 shrink-0 rounded-full px-4 text-[12.5px] font-[800]"
              style={{ background: '#fff', color: palette.gray[900] }}>
              Today
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <GlassAction label="Manual" icon={<Plus size={16} />} onClick={onManualEntry} />
          <GlassAction label="Export" icon={<Download size={16} />} onClick={onExport} />
          <GlassAction label="Trends" icon={<BarChart3 size={16} />} onClick={onGenerateReport} />
        </div>
      </div>
    </PageHero>
  );
}

/** Apple's Exercise ring: the share of the roster that came in. */
function RateRing({ rate, checkedIn, total, loading }: { rate: number; checkedIn: number; total: number; loading: boolean }) {
  const size = 96;
  const stroke = 11;
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
          animate={{ strokeDasharray: `${loading ? 0 : Math.max(rate, 0.5)} 100` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-[850] leading-none tabular-nums tracking-[-0.03em]">{loading ? '—' : `${rate}%`}</span>
      </div>
    </div>
  );
}

function GlassAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-[750] transition-transform active:scale-95"
      style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      {icon}{label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATUS TILES
──────────────────────────────────────────────────────────────── */
function StatusTile({ status, value, total, loading, active, onClick, delay }: {
  status: Status; value: number; total: number; loading: boolean; active: boolean; onClick: () => void; delay: number;
}) {
  const s = STATUS[status];
  const share = total ? Math.round((value / total) * 100) : 0;
  return (
    <m.button
      type="button"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay }}
      onClick={onClick}
      aria-pressed={active}
      className="relative overflow-hidden rounded-[22px] p-4 text-left transition-transform active:scale-[0.98]"
      style={{
        background: `radial-gradient(160px circle at 100% 0%, ${rgba(s.color, 0.16)}, transparent 70%), var(--bg-card)`,
        border: `1.5px solid ${active ? s.color : 'var(--border)'}`,
        boxShadow: active ? `0 12px 28px -14px ${rgba(s.color, 0.6)}` : '0 2px 12px rgba(15,23,42,0.05)',
      }}
    >
      <span className="grid h-10 w-10 place-items-center rounded-[13px] text-white"
        style={{ background: `linear-gradient(135deg, ${rgba(s.color, 0.85)}, ${s.color})`, boxShadow: `0 8px 18px -8px ${rgba(s.color, 0.7)}` }}>
        <s.Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-[28px] font-[850] leading-none tabular-nums tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
        {loading ? '—' : value}
      </p>
      <p className="mt-1.5 flex items-baseline justify-between gap-2 text-[13px] font-[750]" style={{ color: 'var(--text-secondary)' }}>
        {s.label}
        <span className="text-[11px] font-[650] tabular-nums" style={{ color: 'var(--text-muted)' }}>{loading ? '' : `${share}%`}</span>
      </p>
      {/* A thin meter of the roster, so four tiles compare at a glance. */}
      <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
        <m.span className="block h-full rounded-full" style={{ background: s.color }}
          initial={{ width: 0 }} animate={{ width: `${loading ? 0 : share}%` }} transition={{ duration: 0.7, ease: EASE, delay }} />
      </span>
    </m.button>
  );
}

/* ────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL
──────────────────────────────────────────────────────────────── */
function Segmented<T extends string>({ value, onChange, options, className = '' }: {
  value: T; onChange: (v: T) => void; className?: string;
  options: { id: T; label: string; tone: ToneName; badge?: number }[];
}) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-[18px] p-1.5 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {options.map((o) => {
        const on = value === o.id;
        const t = tones[o.tone];
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className="relative flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[13px] text-[13.5px] font-[780] transition-colors"
            style={{ color: on ? '#fff' : 'var(--text-secondary)' }}>
            {on && (
              <m.span layoutId="att-tab" aria-hidden className="absolute inset-0 rounded-[13px]"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                style={{ background: gradient(t), boxShadow: `0 8px 18px -10px ${t.glow}` }} />
            )}
            <span className="relative">{o.label}</span>
            {!!o.badge && (
              <span className="relative grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-[850] tabular-nums"
                style={{ background: on ? 'rgba(255,255,255,0.3)' : gradient(t), color: '#fff' }}>
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
function MembersPanel({ filtered, loading, total, search, setSearch, statusFilter, setStatusFilter, saving, statusOf, recordOf, mark }: {
  filtered: Client[]; loading: boolean; total: number;
  search: string; setSearch: (v: string) => void;
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
  saving: string | null;
  statusOf: (c: Client) => Status;
  recordOf: (c: Client) => Attendance | undefined;
  mark: (c: Client, s: string) => Promise<void>;
}) {
  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'unmarked', label: 'Unmarked' },
    { id: 'present', label: 'Present' }, { id: 'late', label: 'Late' }, { id: 'absent', label: 'Absent' },
  ];
  return (
    <section className="rounded-[26px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="relative">
        <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input aria-label="Search members" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${total} member${total === 1 ? '' : 's'}…`}
          className="h-11 w-full rounded-[14px] pl-10 pr-4 text-[14px] outline-none"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const on = statusFilter === f.id;
          const color = f.id === 'all' ? tones.indigo.from : STATUS[f.id as Status].color;
          return (
            <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)} aria-pressed={on}
              className="h-9 shrink-0 rounded-full px-3.5 text-[12.5px] font-[750] transition-colors"
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
              <div key={i} className="h-[72px] animate-pulse rounded-[18px]" style={{ background: 'var(--bg-subtle)' }} />
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
              <MemberRow key={c.id} client={c} status={statusOf(c)} record={recordOf(c)} saving={saving === c.id} mark={mark} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR', manual: 'Manual', face: 'Face', face_id: 'Face ID', fingerprint: 'Fingerprint', touch_id: 'Touch ID', passkey: 'Passkey', biometric: 'Biometric',
};

const MemberRow = React.memo(function MemberRow({ client, status, record, saving, mark }: {
  client: Client; status: Status; record: Attendance | undefined; saving: boolean;
  mark: (c: Client, s: string) => Promise<void>;
}) {
  const s = STATUS[status];
  const time = clockTime(record?.check_in);
  const method = record?.method ? METHOD_LABEL[record.method] ?? record.method : null;
  return (
    <li className="flex items-center gap-3 rounded-[18px] p-2.5 pr-3"
      style={{ background: status === 'unmarked' ? 'var(--bg-subtle)' : rgba(s.color, 0.07), border: '1px solid var(--border)' }}>
      <span className="shrink-0 rounded-full p-[2.5px]" style={{ background: status === 'unmarked' ? 'var(--border)' : s.color }}>
        <ClientAvatar name={client.name} photoUrl={client.photo_url}
          className="grid h-11 w-11 place-items-center rounded-full text-[13px] font-[800] text-white"
          style={{ background: gradient(tones.indigo), border: '2px solid var(--bg-card)' }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
          {status === 'unmarked' ? 'Not marked' : s.label}
          {time && <> · {time}</>}
          {method && <> · {method}</>}
        </p>
      </div>
      {/* iOS segmented control: the day's status, one tap to change. */}
      <div role="group" aria-label={`Mark ${client.name}`} className="flex shrink-0 gap-0.5 rounded-[12px] p-0.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {(['present', 'late', 'absent'] as const).map((k) => {
          const on = status === k;
          const c = STATUS[k];
          return (
            <button key={k} type="button" onClick={() => !on && mark(client, k)} disabled={saving}
              aria-pressed={on} aria-label={c.label} title={c.label}
              className="grid h-9 w-9 place-items-center rounded-[10px] text-[12.5px] font-[850] transition-colors disabled:opacity-60"
              style={on ? { background: c.color, color: '#fff', boxShadow: `0 4px 10px -4px ${rgba(c.color, 0.8)}` } : { color: 'var(--text-muted)' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : c.short}
            </button>
          );
        })}
      </div>
    </li>
  );
});

/* ────────────────────────────────────────────────────────────────
   RECENT CHECK-INS
──────────────────────────────────────────────────────────────── */
function RecentPanel({ recent, clients }: { recent: Attendance[]; clients: Client[] }) {
  const byId = useMemo(() => new Map(clients.map((c) => [String(c.id), c])), [clients]);
  return (
    <section className="mt-4 rounded-[26px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionTitle icon={<Sparkles size={16} />} tone="aqua" title="Just checked in" subtitle="Today, newest first" />
        <Link href="/checkin/qr-scanner" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[780] text-white"
          style={{ background: gradient(tones.aqua) }}>
          <QrCode size={14} aria-hidden /> Scanner
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="rounded-[16px] px-4 py-6 text-center text-[13px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          No check-ins yet today.
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
    </section>
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[26px] p-4 sm:p-5 ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {children}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   TRENDS (the Insights tab)
──────────────────────────────────────────────────────────────── */
function InsightsPanel({ range, setRange, today, rosterSize, rangeRecords, rangeLoading, monthlyRecords, onExport }: {
  range: string; setRange: (r: string) => void; today: string; rosterSize: number;
  rangeRecords: Attendance[]; rangeLoading: boolean; monthlyRecords: Attendance[]; onExport: () => void;
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
      <RangeBar range={range} setRange={setRange} onExport={onExport} />
      <RangeKpis records={rangeRecords} loading={rangeLoading} />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <SectionTitle icon={<BarChart3 size={16} />} tone="indigo" title="Weekly Attendance Trends"
            subtitle="Members in each day, last 7 days" />
          <div className="mt-4 flex h-48 items-end gap-2">
            {week.map((p, i) => (
              <div key={p.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11.5px] font-[800] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {rangeLoading ? '' : p.checkedIn}
                </span>
                <m.div className="w-full max-w-[44px] rounded-[10px]"
                  style={{ background: p.date === today ? gradient(tones.aqua, 180) : barGradient, minHeight: 6 }}
                  initial={{ height: 6 }}
                  animate={{ height: rangeLoading ? 6 : `${Math.max(4, (p.checkedIn / max) * 100)}%` }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }} />
                <span className="text-[11px] font-[700]" style={{ color: p.date === today ? tones.aqua.ink : 'var(--text-muted)' }}>
                  {p.date === today ? 'Today' : p.label}
                </span>
              </div>
            ))}
          </div>
          {rosterSize > 0 && (
            <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Out of {rosterSize} active member{rosterSize === 1 ? '' : 's'} today.
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle icon={<Clock size={16} />} tone="sunset" title="Peak hours" subtitle={`When members come in · last ${range} days`} />
          <div className="mt-4 space-y-2.5">
            {hours.map((h) => (
              <div key={h.label} className="flex items-center gap-3">
                <p className="w-[86px] shrink-0 text-[12px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{h.label}</p>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                  <m.div className="h-full rounded-full" style={{ background: gradient(tones.sunset, 90) }}
                    initial={{ width: 0 }} animate={{ width: `${h.share}%` }} transition={{ duration: 0.6, ease: EASE }} />
                </div>
                <p className="w-7 text-right text-[12px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{h.count}</p>
              </div>
            ))}
          </div>
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

function RangeBar({ range, setRange, onExport }: { range: string; setRange: (r: string) => void; onExport: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div role="tablist" aria-label="Date range" className="grid flex-1 grid-cols-3 gap-1 rounded-full p-1"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {RANGES.map((r) => {
          const on = range === r.id;
          return (
            <button key={r.id} type="button" role="tab" aria-selected={on} onClick={() => setRange(r.id)}
              className="h-10 truncate rounded-full px-2 text-[13px] font-[750] transition-colors"
              style={on ? { background: gradient(tones.berry), color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {r.label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onExport}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-[750]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        <Download size={15} aria-hidden /> Export
      </button>
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
      <SectionTitle icon={<QrCode size={16} />} tone="aqua" title="Check-in methods" subtitle={`Last ${range} days`} />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
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
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{pct}% of check-ins</p>
            </div>
          );
        })}
      </div>
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
      <SectionTitle icon={<CalendarDays size={16} />} tone="sky" title="Monthly summary" subtitle="Last 6 months" />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>No monthly data yet.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <div key={r.month} className="rounded-[16px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                <p className="text-[14px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {r.checkins}
                  <span className="ml-1 text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>check-ins</span>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.members}</b> members</span>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.avgDaily}</b> avg/day</span>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.onTime}%</b> on time</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────
   ATTENTION — what needs a trainer, from the day's own figures
──────────────────────────────────────────────────────────────── */
type AttentionItem = { key: string; title: string; desc: string; status: Status };

function buildAttention(s: DaySummary, isToday: boolean): AttentionItem[] {
  const out: AttentionItem[] = [];
  const day = isToday ? 'today' : 'that day';
  if (s.unmarked > 0) out.push({ key: 'unmarked', status: 'unmarked', title: `${s.unmarked} not marked ${day}`, desc: 'No check-in and no mark yet. Mark them, or scan them in as they arrive.' });
  if (s.absent > 0) out.push({ key: 'absent', status: 'absent', title: `${s.absent} marked absent`, desc: 'Worth a message — an absence noticed early is easier to turn around.' });
  if (s.late > 0) out.push({ key: 'late', status: 'late', title: `${s.late} arrived late`, desc: 'Marked late on the register.' });
  return out;
}

function AlertsPanel({ alerts, onView }: { alerts: AttentionItem[]; onView: (f: StatusFilter) => void }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-[18px] text-white" style={{ background: gradient(tones.aqua) }}>
            <CheckCircle2 size={26} aria-hidden />
          </span>
          <p className="mt-3 text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>All clear</p>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Everyone is marked and nobody is absent or late.</p>
        </div>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((a) => {
        const s = STATUS[a.status];
        return (
          <div key={a.key} className="rounded-[22px] p-4"
            style={{ background: `radial-gradient(200px circle at 0% 0%, ${rgba(s.color, 0.14)}, transparent 70%), var(--bg-card)`, border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-white" style={{ background: s.color }}>
                {a.status === 'unmarked' ? <AlertTriangle size={18} aria-hidden /> : <s.Icon size={18} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
              </div>
            </div>
            <button type="button" onClick={() => onView(a.status)}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[780]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              View members <ArrowRight size={13} aria-hidden />
            </button>
          </div>
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
            <span id="atd-member-label" className="text-xs font-medium text-zinc-600 dark:text-white/50">Member</span>
            {selectedClient ? (
              <div className="mt-1.5 flex items-center justify-between rounded-[12px] border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{selectedClient.name}</span>
                <button type="button" onClick={() => setSelectedClient(null)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-white/40">Change</button>
              </div>
            ) : (
              <>
                {/* A search box, so the placeholder stays visible and the
                    label is hidden — but it is a real associated <label>, so
                    the name no longer vanishes the moment you type. */}
                <SearchField
                  label="Search member"
                  placeholder="Search member…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  fieldClassName="mt-1.5"
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded-[12px] border border-zinc-100 dark:border-white/5">
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-zinc-400">No members found</p>
                  ) : filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClient(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                      <span className="text-zinc-800 dark:text-white/80">{c.name}</span>
                      <span className="text-xs text-zinc-400">{c.mobile || ''}</span>
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
            <span id="atd-status-label" className="text-xs font-medium text-zinc-600 dark:text-white/50">Status</span>
            <f.form.Field name="status">
              {(field) => (
                <div role="group" aria-labelledby="atd-status-label" className="mt-1.5 flex gap-2">
                  {ATTENDANCE_STATUSES.map(s => (
                    <button key={s} type="button" aria-pressed={field.state.value === s}
                      onClick={() => field.handleChange(s)}
                      className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-medium capitalize transition ${
                        field.state.value === s
                          ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                          : 'border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-white/50'
                      }`}>
                      {s}
                    </button>
                  ))}
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

          {memberError && <p className="text-xs text-rose-600">{memberError}</p>}
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

