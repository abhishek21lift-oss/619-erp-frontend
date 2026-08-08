'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PullToRefresh, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, PageContainer, PageHero } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Client, Attendance } from '@/lib/api';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  Download,
  Eye,
  FileText,
  Grid3x3,
  LayoutList,
  Loader2,
  Mail,
  MessageSquare,
  MoreVertical,
  Plus,
  Scan,
  Search,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';

/** Range CSV, carried over from /attendance/reports. */
function exportRangeCSV(records: Attendance[], days: string) {
  const header = ['Date', 'Member', 'Status', 'Check-In Time', 'Check-Out Time'];
  const rows = records.map(r => [r.date ?? '', r.ref_name ?? r.ref_id ?? '', r.status ?? '', r.check_in ?? '', r.check_out ?? '']);
  const csv = [header, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${days}days-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────── */
type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'unmarked';

export interface FeedItem {
  id: string | number;
  name: string;
  action: string;
  time: string;
  status: string;
  avatar: string;
}

function buildFeedFromRecords(records: Attendance[], clients: Client[]): FeedItem[] {
  const now = Date.now();
  return records
    .filter(r => r.check_in)
    .slice(0, 6)
    .map(r => {
      const client = clients.find(c => c.id === r.ref_id);
      const name = client?.name || r.ref_name || 'Unknown';
      const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      const checkTime = r.check_in ? new Date(`1970-01-01T${r.check_in}`).getTime() : 0;
      const minsAgo = Math.round((now - checkTime) / 60000);
      const action = r.status === 'late' ? 'arrived late' : 'checked in';
      return { id: r.id ?? '', name, action, time: `${Math.max(1, minsAgo)} min ago`, status: r.status, avatar: initials };
    });
}

function buildWeeklyBars(records: Attendance[]): { day: string; pct: number }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCount: Record<string, { present: number; total: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayCount[days[d.getDay()]] = { present: 0, total: 0 };
  }
  records.forEach(r => {
    const d = new Date(r.date || Date.now());
    const key = days[d.getDay()];
    if (dayCount[key]) {
      dayCount[key].total++;
      if (r.status === 'present' || r.status === 'late') dayCount[key].present++;
    }
  });
  return Object.entries(dayCount).map(([day, v]) => ({
    day,
    pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));
}

interface SmartAlert { type: string; title: string; desc: string; icon: React.ReactNode; statusFilter: StatusFilter; }

function buildAlerts(recordMap: Map<string | number, Attendance>, records: Attendance[], clients: Client[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const absent = clients.filter(c => !recordMap.has(c.id));
  if (absent.length > 0) {
    alerts.push({ type: 'warn', title: `${absent.length} members absent today`, desc: 'No check-in recorded for these members.', icon: <AlertTriangle className="h-4 w-4" />, statusFilter: 'unmarked' });
  }
  const late = records.filter(r => r.status === 'late');
  if (late.length > 0) {
    const names = late.slice(0, 3).map(r => r.ref_name).filter(Boolean).join(', ');
    alerts.push({ type: 'amber', title: `${late.length} members arrived late`, desc: names ? `${names} checking in after 10 AM.` : 'Late check-ins detected.', icon: <ArrowDownLeft className="h-4 w-4" />, statusFilter: 'late' });
  }
  const perfect = clients.filter(c => recordMap.get(c.id)?.status === 'present');
  if (perfect.length > 0) {
    alerts.push({ type: 'green', title: `${perfect.length} members marked present`, desc: 'On-time attendance recorded.', icon: <Sparkles className="h-4 w-4" />, statusFilter: 'present' });
  }
  return alerts.length > 0 ? alerts : [{ type: 'info', title: 'All clear', desc: 'No attendance anomalies detected today.', icon: <Clock className="h-4 w-4" />, statusFilter: 'all' }];
}

const PEAK_HOUR_BUCKETS = [
  { label: '6–8 AM', startHour: 6, endHour: 8 },
  { label: '8–10 AM', startHour: 8, endHour: 10 },
  { label: '10 AM–12', startHour: 10, endHour: 12 },
  { label: '4–6 PM', startHour: 16, endHour: 18 },
  { label: '6–8 PM', startHour: 18, endHour: 20 },
];

function buildPeakHours(records: Attendance[], totalClients: number): { label: string; pct: number }[] {
  const counts = PEAK_HOUR_BUCKETS.map(() => 0);
  records.forEach(r => {
    if (!r.check_in) return;
    const hour = new Date(`1970-01-01T${r.check_in}`).getHours();
    PEAK_HOUR_BUCKETS.forEach((b, i) => { if (hour >= b.startHour && hour < b.endHour) counts[i]++; });
  });
  const denom = totalClients || 1;
  return PEAK_HOUR_BUCKETS.map((b, i) => ({ label: b.label, pct: Math.round((counts[i] / denom) * 100) }));
}

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

/* ────────────────────────────────────────────────────────────────
   MAIN CONTENT  —  all original logic preserved
──────────────────────────────────────────────────────────────── */
function AttendanceContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router  = useRouter();
  const today   = new Date().toISOString().split('T')[0];

  /* ── state ── */
  const [date,      setDate]      = useState(today);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [records,   setRecords]   = useState<Attendance[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState<string | null>(null);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [search,    setSearch]    = useState('');

  /* ── UI state ── */
  const [viewMode,      setViewMode]      = useState<ViewMode>('table');
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  // ?tab=insights is what /attendance/reports redirects to, so the old
  // bookmark lands on the panel its content moved into rather than on the
  // member list.
  const sp = useSearchParams();
  const [activeTab, setActiveTab] = useState<'members' | 'insights' | 'alerts'>(
    sp.get('tab') === 'insights' ? 'insights' : sp.get('tab') === 'alerts' ? 'alerts' : 'members',
  );
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  /* ── Trends, merged in from the old /attendance/reports page ──
     Fetched only once the Insights tab is opened: it is two more requests
     over 90 days of history, and the tab a trainer actually lands on is the
     member list. */
  const [range, setRange] = useState('7');
  const [rangeRecords, setRangeRecords] = useState<Attendance[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState<Attendance[]>([]);
  const successTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function showSuccess(msg: string) { clearTimeout(successTimer.current); setSuccess(msg); successTimer.current = setTimeout(() => setSuccess(''), 1800); }
  function showError(msg: string) { clearTimeout(errorTimer.current); setError(msg); errorTimer.current = setTimeout(() => setError(''), 5000); }

  /* ── data fetch ── */
  const loadData = useCallback(() => {
    setLoading(true);
    return Promise.all([
      api.clients.list({ status: 'active' }),
      api.attendance.list({ date, type: 'client' }),
    ])
      .then(([c, a]) => { setClients(c); setRecords(a); })
      .catch((e: Error) => showError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    loadData();
    return () => { clearTimeout(successTimer.current); clearTimeout(errorTimer.current); };
  }, [date, loadData]);

  useEffect(() => {
    if (activeTab !== 'insights') return;
    let alive = true;
    setRangeLoading(true);
    Promise.all([
      api.attendance.list({ days: range }),
      api.attendance.list({ months: '12' }),
    ])
      .then(([r, m]) => {
        if (!alive) return;
        setRangeRecords(Array.isArray(r) ? r : []);
        setMonthlyRecords(Array.isArray(m) ? m : []);
      })
      .catch((e: Error) => alive && showError(e.message))
      .finally(() => alive && setRangeLoading(false));
    return () => { alive = false; };
  }, [activeTab, range]);

  /* ── mark function ── */
  const mark = useCallback(async (client: Client, status: string) => {
    setSaving(client.id);
    try {
      await api.attendance.mark({
        type:         'client',
        ref_id:       client.id,
        ref_name:     client.name,
        trainer_id:   client.trainer_id,
        trainer_name: client.trainer_name,
        date,
        status,
      });
      const updated = await api.attendance.list({ date, type: 'client' });
      setRecords(updated);
      showSuccess(`Marked ${client.name} as ${status}`);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Failed to mark attendance');
    } finally {
      setSaving(null);
    }
  }, [date]);

  /* ── O(1) record lookup map ── */
  const recordMap = useMemo(
    () => new Map<string | number, Attendance>(records.map(r => [r.ref_id, r])),
    [records]
  );

  /* ── bulk mark-all: parallel API calls + single re-fetch ── */
  async function markAllPresent() {
    const toMark = filtered.filter(c => !recordMap.has(c.id));
    if (!toMark.length) return;
    try {
      await Promise.all(
        toMark.map(c =>
          api.attendance.mark({
            type:         'client',
            ref_id:       c.id,
            ref_name:     c.name,
            trainer_id:   c.trainer_id,
            trainer_name: c.trainer_name,
            date,
            status:       'present',
          })
        )
      );
      const updated = await api.attendance.list({ date, type: 'client' });
      setRecords(updated);
      showSuccess(`Marked ${toMark.length} member${toMark.length > 1 ? 's' : ''} present`);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Failed to mark all present');
    }
  }

  function getRecord(clientId: string | number) {
    return recordMap.get(clientId);
  }

  /* ── derived: single-pass summary + rate ── */
  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
    }
    const total = clients.length;
    const attendanceRate = total > 0
      ? Math.round(((present + late) / total) * 100)
      : 0;
    return { present, absent, late, unmarked: total - records.length, total, attendanceRate };
  }, [records, clients]);

  const feedItems   = useMemo(() => buildFeedFromRecords(records, clients), [records, clients]);
  const weeklyBars  = useMemo(() => buildWeeklyBars(records), [records]);
  const smartAlerts = useMemo(() => buildAlerts(recordMap, records, clients), [recordMap, records, clients]);
  const peakHours   = useMemo(() => buildPeakHours(records, clients.length), [records, clients]);

  const filtered = useMemo(() =>
    clients.filter((c) => {
      const rec = recordMap.get(c.id);
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.mobile || '').includes(search) ||
        (c.client_id || '').includes(search);
      const matchStatus =
        statusFilter === 'all'      ? true :
        statusFilter === 'present'  ? rec?.status === 'present' :
        statusFilter === 'absent'   ? rec?.status === 'absent' :
        statusFilter === 'late'     ? rec?.status === 'late' :
        statusFilter === 'unmarked' ? !rec : true;
      return matchSearch && matchStatus;
    }),
    [clients, recordMap, search, statusFilter]
  );

  const { attendanceRate } = summary;

  return (
    <AppShell>
      <div className="relative min-h-screen">
        {/* FooterBar below is position:sticky, which breaks under a
            transformed ancestor — keep it outside PullToRefresh's wrapper. */}
        <PullToRefresh onRefresh={loadData}>
        <PageContainer>

          {/* ── toasts ── */}
          {error   && <Toast msg={error}   type="error"   onClose={() => setError('')} />}
          {success && <Toast msg={success} type="success" onClose={() => setSuccess('')} />}

          {/* ── HERO ── */}
          <AttendanceHero
            date={date} setDate={setDate} today={today}
            onMarkAll={date === today ? markAllPresent : undefined}
            onManualEntry={() => setManualEntryOpen(true)}
            onExport={() => window.open(`/api/attendance?format=csv&date=${date}`, '_blank')}
            onReports={() => setActiveTab('insights')}
          />

          {/* ── KPI CARDS ── */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            <KpiCard label="Present"   value={summary.present}  hint={`${summary.total > 0 ? Math.round(summary.present / summary.total * 100) : 0}% of total`}  accent="emerald" icon={<UserCheck className="h-5 w-5" />} onClick={() => setStatusFilter('present')}  active={statusFilter === 'present'} />
            <KpiCard label="Absent"    value={summary.absent}   hint={`${summary.total > 0 ? Math.round(summary.absent  / summary.total * 100) : 0}% of total`}  accent="rose"    icon={<UserX    className="h-5 w-5" />} onClick={() => setStatusFilter('absent')}   active={statusFilter === 'absent'} />
            <KpiCard label="Late"      value={summary.late}     hint="Arrived after cut-off" accent="amber"   icon={<Clock    className="h-5 w-5" />} onClick={() => setStatusFilter('late')}     active={statusFilter === 'late'} />
            <KpiCard label="Unmarked"  value={summary.unmarked} hint="Pending today"         accent="zinc"    icon={<Users    className="h-5 w-5" />} onClick={() => setStatusFilter('unmarked')} active={statusFilter === 'unmarked'} />
            <KpiCard label="Total"     value={summary.total}    hint="Active members"        accent="sky"     icon={<Activity className="h-5 w-5" />} onClick={() => setStatusFilter('all')}      active={statusFilter === 'all'} />
            <KpiCard label="Rate"      value={`${attendanceRate}%`} hint="Attendance today"  accent="violet"  icon={<TrendingUp className="h-5 w-5" />} />
          </section>

          {/* This page used to carry a check-in panel of its own — fingerprint
              and member-code entry — which wrote the same attendance_logs rows
              the QR scanner writes. Check-in now happens in exactly one place,
              /checkin/qr-scanner. This page reads and corrects the record. */}

          {/* ── TAB BAR ── */}
          <div className="mt-6 flex flex-wrap gap-2 rounded-[22px] border border-zinc-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            {(['members', 'insights', 'alerts'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`rounded-[16px] px-4 py-2.5 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'bg-[linear-gradient(135deg,#F59E0B,#D97706)] text-white shadow-[0_6px_20px_rgba(245,158,11,0.3)]'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:bg-white/10 hover:text-zinc-900 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white'
                }`}>
                {tab === 'members' ? 'Member Attendance' : tab === 'insights' ? 'Insights & Trends' : 'Smart Alerts'}
                {tab === 'alerts' && smartAlerts.length > 0 && (
                  <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-xs text-white">{smartAlerts.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB PANELS ── */}
          <div className="mt-5">
            {activeTab === 'members' && (
              <MembersPanel
                filtered={filtered} loading={loading}
                search={search} setSearch={setSearch}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                viewMode={viewMode} setViewMode={setViewMode}
                saving={saving} getRecord={getRecord} mark={mark}
                date={date} today={today} onMarkAll={date === today ? markAllPresent : undefined}
              />
            )}
            {activeTab === 'insights' && (
              <InsightsPanel
                summary={summary} weeklyBars={weeklyBars} peakHours={peakHours}
                range={range} setRange={setRange}
                rangeRecords={rangeRecords} rangeLoading={rangeLoading}
                monthlyRecords={monthlyRecords}
                onExport={() => exportRangeCSV(rangeRecords, range)}
              />
            )}
            {activeTab === 'alerts'   && (
              <AlertsPanel
                alerts={smartAlerts}
                onViewMembers={(f) => { setStatusFilter(f); setActiveTab('members'); }}
                onSendReminder={() => router.push('/engagement/notifications')}
              />
            )}
          </div>

          {/* ── LIVE FEED ── */}
          <LiveFeedPanel feedItems={feedItems} />

          {/* ── QUICK ACTIONS ── */}
          <QuickActionsPanel onMarkAll={date === today ? markAllPresent : undefined} onTrends={() => setActiveTab('insights')} />

        </PageContainer>
        </PullToRefresh>

        {/* ── FOOTER BAR ── */}
        <FooterBar onSync={loadData} onGenerateReport={() => setActiveTab('insights')} />

        {/* ── MANUAL ENTRY MODAL ── */}
        <ManualEntryModal
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
          clients={clients}
          date={date}
          onSuccess={loadData}
        />
      </div>
    </AppShell>
  );
}

/* ────────────────────────────────────────────────────────────────
   HERO
──────────────────────────────────────────────────────────────── */
/**
 * ── What came out of this hero, and why ───────────────────────────────────
 *
 * A pale `#f8fafc` slab — a container box drawn around the title, on its own
 * surface, squared off against the top bar. It is PageHero now, the same one
 * the dashboard uses.
 *
 * Four stat tiles: Present today, Attendance rate, Late arrivals, Unmarked.
 * Every one of those numbers is repeated in the KPI row that renders directly
 * underneath, which also adds Absent and Total. On a phone the two stacks are
 * both one-per-row, so the page opened with the same four figures twice and
 * you scrolled past two screens of them before reaching a single member. The
 * KPI row is the one that survives: it has all six, and its tiles filter the
 * list when you tap them.
 *
 * "Live sync active" and "Biometric device connected". Neither was connected
 * to anything — no socket, no device handshake, no state of any kind behind
 * them; they were literals that always rendered. A green pulsing dot that
 * claims a device is online when nothing has asked a device anything is worse
 * than no indicator, because a trainer will believe it and stop checking. Gone
 * until something real backs them.
 */
function AttendanceHero({ date, setDate, today, onMarkAll, onManualEntry, onExport, onReports }: {
  date: string; setDate: (d: string) => void; today: string;
  onMarkAll?: () => void;
  onManualEntry: () => void;
  onExport: () => void;
  onReports: () => void;
}) {
  return (
    <PageHero
      icon={<UserCheck size={20} />}
      title="Member Attendance"
      subtitle="Mark the day, correct a record, and see who is turning up."
    >
      <div className="space-y-2.5">
        <input
          aria-label="Attendance date"
          type="date" value={date}
          onChange={e => setDate(e.target.value)}
          max={today}
          className="h-[44px] w-full min-w-0 rounded-[12px] px-3 text-[13px] font-[600] text-white outline-none sm:max-w-[220px]"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }}
        />
        {/* Mark All Present is the destructive-ish one — it writes a row for
            every active member — so it sits apart from the three that only
            read, and it is the only one that gets a solid fill. The four used
            to be an undifferentiated wrap of pills. */}
        <div className="grid grid-cols-3 gap-2">
          <HeroBtn label="Manual" icon={<Plus className="h-4 w-4" />} light onClick={onManualEntry} />
          <HeroBtn label="Export" icon={<Download className="h-4 w-4" />} light onClick={onExport} />
          <HeroBtn label="Trends" icon={<FileText className="h-4 w-4" />} light onClick={onReports} />
        </div>
        {onMarkAll && (
          <HeroBtn label="Mark All Present" icon={<CheckCircle2 className="h-4 w-4" />} primary onClick={onMarkAll} full />
        )}
      </div>
    </PageHero>
  );
}

/* ────────────────────────────────────────────────────────────────
   MEMBERS TABLE PANEL
──────────────────────────────────────────────────────────────── */
function MembersPanel({ filtered, loading, search, setSearch, statusFilter, setStatusFilter, viewMode, setViewMode, saving, getRecord, mark, date, today, onMarkAll }: {
  filtered: Client[]; loading: boolean;
  search: string; setSearch: (v: string) => void;
  statusFilter: StatusFilter; setStatusFilter: (v: StatusFilter) => void;
  viewMode: ViewMode; setViewMode: (v: ViewMode) => void;
  saving: string | null;
  getRecord: (id: string) => Attendance | undefined;
  mark: (c: Client, status: string) => Promise<void>;
  date: string; today: string;
  onMarkAll?: () => void;
}) {
  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'present', label: 'Present' },
    { id: 'absent', label: 'Absent' }, { id: 'late', label: 'Late' }, { id: 'unmarked', label: 'Unmarked' },
  ];

  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">Member Attendance</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{filtered.length} members · P = Present · A = Absent · L = Late</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onMarkAll && (
            <button onClick={onMarkAll} className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />Mark All Present
            </button>
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-white/40" />
          <input aria-label="Search members" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member…"
            className="w-full rounded-[14px] border border-zinc-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30" />
        </div>
        <div className="flex gap-1 rounded-[14px] border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-white/5">
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === f.id ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/12 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-white/40 dark:hover:text-white/70'
              }`}>{f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1 rounded-[14px] border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-white/5">
          <button aria-label="Table view" onClick={() => setViewMode('table')} className={`rounded-[10px] p-2 transition ${ viewMode === 'table' ? 'bg-white shadow-sm dark:bg-white/12' : 'text-zinc-400 dark:text-white/30' }`}><LayoutList className="h-4 w-4" /></button>
          <button aria-label="Grid view"  onClick={() => setViewMode('grid')}  className={`rounded-[10px] p-2 transition ${ viewMode === 'grid'  ? 'bg-white shadow-sm dark:bg-white/12' : 'text-zinc-400 dark:text-white/30' }`}><Grid3x3  className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No members found" desc="Try adjusting search or status filters." />
      ) : viewMode === 'table' ? (
        <TableView filtered={filtered} saving={saving} getRecord={getRecord} mark={mark} />
      ) : (
        <GridView filtered={filtered} saving={saving} getRecord={getRecord} mark={mark} />
      )}
    </section>
  );
}

type SortCol = 'Member' | 'Plan' | 'Trainer' | 'Status' | 'Check-in';

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: SortCol | null; sortDir: 'asc' | 'desc' }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60 transition-opacity" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-amber-500" />
    : <ChevronDown className="w-3 h-3 text-amber-500" />;
}

function TableView({ filtered, saving, getRecord, mark }: {
  filtered: Client[]; saving: string | null;
  getRecord: (id: string) => Attendance | undefined;
  mark: (c: Client, s: string) => Promise<void>;
}) {
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      let av = '', bv = '';
      if (sortCol === 'Member') { av = a.name ?? ''; bv = b.name ?? ''; }
      else if (sortCol === 'Plan') { av = a.package_type ?? ''; bv = b.package_type ?? ''; }
      else if (sortCol === 'Trainer') { av = a.trainer_name ?? ''; bv = b.trainer_name ?? ''; }
      else if (sortCol === 'Status') { av = getRecord(a.id)?.status ?? 'unmarked'; bv = getRecord(b.id)?.status ?? 'unmarked'; }
      else if (sortCol === 'Check-in') { av = getRecord(a.id)?.check_in ?? ''; bv = getRecord(b.id)?.check_in ?? ''; }
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, getRecord]);

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const someSelected = !allSelected && filtered.some(c => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const toggleRow = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkMark = async (status: string) => {
    const clients = filtered.filter(c => selected.has(c.id));
    setBulkSaving(true);
    await Promise.allSettled(clients.map(c => mark(c, status)));
    setBulkSaving(false);
    setSelected(new Set());
  };

  const SORTABLE: SortCol[] = ['Member', 'Plan', 'Trainer', 'Status', 'Check-in'];

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-[14px] border border-amber-200/60 bg-amber-50/80 px-4 py-2.5 dark:border-amber-400/20 dark:bg-amber-400/5">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-zinc-500 dark:text-white/40 mr-1">Mark as:</span>
            {[
              { status: 'present', label: 'Present', cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
              { status: 'absent',  label: 'Absent',  cls: 'bg-rose-500 hover:bg-rose-600 text-white' },
              { status: 'late',    label: 'Late',    cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
            ].map(({ status, label, cls }) => (
              <button
                key={status}
                onClick={() => bulkMark(status)}
                disabled={bulkSaving}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold transition disabled:opacity-50 ${cls}`}
              >
                {bulkSaving ? '…' : label}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              className="ml-1 px-2.5 py-1 rounded-[8px] text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/5 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[20px] border border-zinc-200/70 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500 dark:bg-white/5 dark:text-white/40">
            <tr>
              {/* Bulk select all */}
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-300 accent-amber-500 cursor-pointer dark:border-white/20"
                  aria-label="Select all"
                />
              </th>
              {SORTABLE.map(h => (
                <th key={h} className="px-5 py-4 font-medium">
                  <button
                    onClick={() => handleSort(h)}
                    className="group inline-flex items-center gap-1 font-medium uppercase tracking-wider hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    {h}
                    <SortIcon col={h} sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const rec = getRecord(c.id);
              const isSelected = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`border-t border-zinc-100 transition hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5 ${isSelected ? 'bg-amber-50/60 dark:bg-amber-400/5' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(c.id)}
                      className="h-4 w-4 rounded border-zinc-300 accent-amber-500 cursor-pointer dark:border-white/20"
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar client={c} />
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-zinc-400 dark:text-white/30">{c.client_id || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-white/10 dark:text-white/65">{c.package_type || '—'}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500 dark:text-white/40">{c.trainer_name || '—'}</td>
                  <td className="px-5 py-4">{rec ? <StatusBadge status={rec.status} /> : <StatusBadge status="unmarked" />}</td>
                  <td className="px-5 py-4 text-xs tabular-nums text-zinc-500 dark:text-white/40">{rec?.check_in || '—'}</td>
                  <td className="px-5 py-4">
                    <AttendanceBtns client={c} rec={rec} saving={saving} mark={mark} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridView({ filtered, saving, getRecord, mark }: {
  filtered: Client[]; saving: string | null;
  getRecord: (id: string) => Attendance | undefined;
  mark: (c: Client, s: string) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map(c => {
        const rec = getRecord(c.id);
        return (
          <div key={c.id} className="rounded-[22px] border border-zinc-200/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <MemberAvatar client={c} large />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-zinc-400 dark:text-white/30">{c.package_type || '—'}</p>
                </div>
              </div>
              {rec ? <StatusBadge status={rec.status} /> : <StatusBadge status="unmarked" />}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-zinc-500 dark:text-white/40">{rec?.check_in ? `Checked in ${rec.check_in}` : 'Not yet marked'}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <AttendanceBtns client={c} rec={rec} saving={saving} mark={mark} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const AttendanceBtns = React.memo(function AttendanceBtns({ client, rec, saving, mark }: {
  client: Client; rec: Attendance | undefined; saving: string | null;
  mark: (c: Client, s: string) => Promise<void>;
}) {
  const isSaving = saving === client.id;
  return (
    <div className="flex items-center gap-1.5">
      {([
        { status: 'present', label: 'P', active: 'bg-emerald-500/15 text-emerald-700 border-emerald-400/40 ring-2 ring-emerald-300/30 dark:text-emerald-300', inactive: 'border-zinc-200 bg-white text-zinc-500 hover:border-emerald-300 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-white/40' },
        { status: 'absent',  label: 'A', active: 'bg-rose-500/15 text-rose-700 border-rose-400/40 ring-2 ring-rose-300/30 dark:text-rose-300',             inactive: 'border-zinc-200 bg-white text-zinc-500 hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-white/40' },
        { status: 'late',    label: 'L', active: 'bg-amber-500/15 text-amber-700 border-amber-400/40 ring-2 ring-amber-300/30 dark:text-amber-300',          inactive: 'border-zinc-200 bg-white text-zinc-500 hover:border-amber-300 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-white/40' },
      ] as const).map(({ status, label, active, inactive }) => (
        <button
          key={status}
          onClick={() => mark(client, status)}
          disabled={isSaving}
          className={`h-9 w-9 rounded-[10px] border text-xs font-bold transition ${ rec?.status === status ? active : inactive } ${isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          {isSaving ? '…' : label}
        </button>
      ))}
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────
   INSIGHTS PANEL
──────────────────────────────────────────────────────────────── */
/**
 * Insights & Trends — the merged panel.
 *
 * ── What was merged into it ────────────────────────────────────────────────
 *
 * /attendance/reports was a second page called "Reports & Dashboard",
 * reachable only from two buttons on this one. It read the same
 * api.attendance.list this page reads and led with the same four numbers —
 * Total, Present, Late, Absent — over a range instead of a day. So a trainer
 * asking "how has attendance been" had two pages telling them, in two visual
 * languages, from one table.
 *
 * Its three parts are here now: the range selector, the check-in method
 * breakdown and the monthly summary. /attendance/reports redirects here, so
 * anything bookmarked or linked still lands in the right place.
 *
 * What did not come across is its "Footfall Trend" card. It was labelled a
 * trend and drew one bar per STATUS — present, late, absent — with no time
 * axis at all. It could not show a trend; the Weekly Attendance Trends chart
 * below, which does plot days, is what that card was pretending to be.
 */
function InsightsPanel({
  summary, weeklyBars, peakHours, range, setRange, rangeRecords, rangeLoading, monthlyRecords, onExport,
}: {
  summary: { present: number; absent: number; late: number; unmarked: number; total: number };
  weeklyBars: { day: string; pct: number }[];
  peakHours: { label: string; pct: number }[];
  range: string;
  setRange: (r: string) => void;
  rangeRecords: Attendance[];
  rangeLoading: boolean;
  monthlyRecords: Attendance[];
  onExport: () => void;
}) {
  const bars = weeklyBars.length > 0 ? weeklyBars : [{ day: '—', pct: 0 }];
  const max = Math.max(...bars.map(b => b.pct), 1);
  return (
    <div className="space-y-4">
      <RangeBar range={range} setRange={setRange} onExport={onExport} />
      <RangeKpis records={rangeRecords} loading={rangeLoading} />
      <MethodBreakdown records={rangeRecords} range={range} />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <PremiumCard title="Weekly Attendance Trends" subtitle="Last 7 days — daily attendance rate">
        <div className="flex h-44 items-end gap-2 pt-4">
          {bars.map((b, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-white/55">{b.pct}%</p>
              <div className="w-full rounded-t-[10px] transition-all" style={{ height: `${(b.pct / max) * 140}px`, background: b.pct >= 85 ? 'linear-gradient(180deg,#10b981,#059669)' : b.pct >= 70 ? 'linear-gradient(180deg,#F59E0B,#D97706)' : 'linear-gradient(180deg,#ef4444,#dc2626)' }} />
              <p className="text-xs text-zinc-400 dark:text-white/30">{b.day}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          {[['#10b981', '≥ 85% great'], ['#F59E0B', '70–84% average'], ['#ef4444', '< 70% low']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5 text-zinc-500 dark:text-white/40"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </PremiumCard>

      <div className="space-y-4">
        <PremiumCard title="Today's breakdown" subtitle="Live distribution">
          <div className="space-y-3">
            {([
              { label: 'Present',  value: summary.present,  color: '#10b981', bg: 'bg-emerald-500/15' },
              { label: 'Absent',   value: summary.absent,   color: '#dc2626', bg: 'bg-rose-500/15' },
              { label: 'Late',     value: summary.late,     color: '#f59e0b', bg: 'bg-amber-500/15' },
              { label: 'Unmarked', value: summary.unmarked, color: '#64748b', bg: 'bg-zinc-400/15' },
            ] as const).map(item => (
              <div key={item.label} className="rounded-[14px] bg-zinc-50 p-3 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700 dark:text-white/70">{item.label}</p>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${summary.total > 0 ? (item.value / summary.total) * 100 : 0}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard title="Peak hours" subtitle="Today's check-in distribution">
          <div className="space-y-2">
            {peakHours.map(({ label, pct }) => (
              <div key={label} className="flex items-center gap-3">
                <p className="w-20 shrink-0 text-xs text-zinc-500 dark:text-white/40">{label}</p>
                <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#F59E0B,#FBBF24)]" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="w-8 text-right text-xs font-medium text-zinc-600 dark:text-white/55">{pct}%</p>
              </div>
            ))}
          </div>
        </PremiumCard>
      </div>
      </div>

      <MonthlySummary records={monthlyRecords} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MERGED FROM /attendance/reports
──────────────────────────────────────────────────────────────── */

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
];

function RangeBar({ range, setRange, onExport }: { range: string; setRange: (r: string) => void; onExport: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="grid flex-1 gap-1 rounded-full p-1"
        style={{ background: 'var(--bg-subtle)', gridTemplateColumns: `repeat(${RANGES.length}, minmax(0, 1fr))` }}
        role="tablist"
        aria-label="Date range"
      >
        {RANGES.map(r => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRange(r.id)}
              className="h-[38px] cursor-pointer truncate rounded-full px-2 text-[12.5px] font-[700] transition-colors"
              style={{
                background: active ? 'var(--brand)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12.5px] font-[700] transition-transform active:scale-95"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        <Download size={14} /> Export
      </button>
    </div>
  );
}

const RANGE_KPIS = [
  { key: 'total',   label: 'Check-ins', color: 'var(--brand)' },
  { key: 'present', label: 'Present',   color: '#059669' },
  { key: 'late',    label: 'Late',      color: '#B45309' },
  { key: 'absent',  label: 'Absent',    color: '#DC2626' },
] as const;

function RangeKpis({ records, loading }: { records: Attendance[]; loading: boolean }) {
  return (
    // Two up on a phone. The page this came from used
    // `auto-fit minmax(200px, 1fr)`, which is one full-width tile per row at
    // 390px — four numbers, four screenfuls.
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {RANGE_KPIS.map(k => {
        const value = k.key === 'total' ? records.length : records.filter(r => r.status === k.key).length;
        return (
          <div key={k.key} className="rounded-[16px] p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-[800] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            {loading
              ? <div className="mt-2 h-[26px] w-12 animate-pulse rounded-md" style={{ background: 'var(--bg-subtle)' }} />
              : <p className="mt-1.5 text-[24px] font-[800] tabular-nums leading-none" style={{ color: k.color }}>{value}</p>}
          </div>
        );
      })}
    </div>
  );
}

const METHOD_META: Record<string, { label: string; color: string }> = {
  qr:          { label: 'QR Code',     color: '#0067e0' },
  face:        { label: 'Face',        color: '#0067e0' },
  face_id:     { label: 'Face ID',     color: '#0067e0' },
  touch_id:    { label: 'Touch ID',    color: '#059669' },
  fingerprint: { label: 'Fingerprint', color: '#059669' },
  passkey:     { label: 'Passkey',     color: '#0067e0' },
  biometric:   { label: 'Biometric',   color: '#B45309' },
  manual:      { label: 'Manual',      color: '#64748B' },
};

function MethodBreakdown({ records, range }: { records: Attendance[]; range: string }) {
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of records) {
      const m = (r as Attendance & { check_in_method?: string }).check_in_method || 'manual';
      acc[m] = (acc[m] || 0) + 1;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [records]);

  if (counts.length === 0) return null;
  const total = records.length || 1;

  return (
    <PremiumCard title="Check-in methods" subtitle={`Last ${range} days`}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {counts.map(([method, count]) => {
          const meta = METHOD_META[method] ?? { label: method, color: '#64748B' };
          const pct = Math.round((count / total) * 100);
          return (
            <div key={method} className="rounded-[14px] p-3" style={{ background: 'var(--bg-subtle)' }}>
              <p className="truncate text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>{meta.label}</p>
              <p className="mt-1 text-[20px] font-[800] tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{count}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: 'var(--border-2)' }}>
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
              </div>
              <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{pct}% of check-ins</p>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

function MonthlySummary({ records }: { records: Attendance[] }) {
  const rows = useMemo(() => {
    const byMonth: Record<string, { checkins: number; members: Set<string>; present: number; days: Set<string> }> = {};
    for (const r of records) {
      const date = r.date || '';
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
      checkins: d.checkins,
      members: d.members.size,
      // Per DAY the studio was open, not per record — the version this came
      // from divided the month's check-ins by the number of records in that
      // month, which is checkins/checkins and prints 1 for every month.
      avgDaily: Math.round(d.checkins / Math.max(d.days.size, 1)),
      presentPct: Math.round((d.present / Math.max(d.checkins, 1)) * 100),
    }));
  }, [records]);

  return (
    <PremiumCard title="Monthly summary" subtitle="Last 6 months">
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>No monthly data yet.</p>
      ) : (
        // Cards, not a five-column table. At 390px a table of Month /
        // Check-Ins / Members / Avg Daily / Peak Day gives each column about
        // 60px, and the page this came from simply let it scroll sideways.
        <div className="space-y-2.5">
          {rows.map(r => (
            <div key={r.month} className="rounded-[14px] p-3" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{r.month}</p>
                <p className="text-[13px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {r.checkins}
                  <span className="ml-1 text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>check-ins</span>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.members}</b> members</span>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.avgDaily}</b> avg/day</span>
                <span><b className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{r.presentPct}%</b> present</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PremiumCard>
  );
}

/* ────────────────────────────────────────────────────────────────
   ALERTS PANEL
──────────────────────────────────────────────────────────────── */
function AlertsPanel({ alerts, onViewMembers, onSendReminder }: {
  alerts: SmartAlert[];
  onViewMembers: (filter: StatusFilter) => void;
  onSendReminder: () => void;
}) {
  const COLORS: Record<string, string> = {
    warn:  'border-rose-400/30 bg-rose-500/8 dark:bg-rose-900/15',
    info:  'border-sky-400/30 bg-sky-500/8 dark:bg-sky-900/15',
    amber: 'border-amber-400/30 bg-amber-500/8 dark:bg-amber-900/15',
    green: 'border-emerald-400/30 bg-emerald-500/8 dark:bg-emerald-900/15',
  };
  const ICON_COLORS: Record<string, string> = {
    warn: 'text-rose-500', info: 'text-sky-500', amber: 'text-amber-500', green: 'text-emerald-500',
  };
  return (
    <PremiumCard title="Smart Alerts" subtitle="AI-powered operational insights based on attendance patterns">
      <div className="grid gap-4 sm:grid-cols-2">
        {alerts.map((a, i) => (
          <div key={i} className={`rounded-[20px] border p-5 transition hover:-translate-y-0.5 ${COLORS[a.type]}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${ICON_COLORS[a.type]}`}>{a.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-zinc-900 dark:text-white/90">{a.title}</p>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-white/45">{a.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <SmBtn label="View members" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => onViewMembers(a.statusFilter)} />
              <SmBtn label="Send reminder" icon={<Bell className="h-3.5 w-3.5" />} onClick={onSendReminder} />
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

/* ────────────────────────────────────────────────────────────────
   LIVE FEED
──────────────────────────────────────────────────────────────── */
function LiveFeedPanel({ feedItems }: { feedItems: FeedItem[] }) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/40">Live activity</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">Real-time feed</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live
        </span>
      </div>
      {feedItems.length === 0 ? (
        <div className="rounded-[20px] border border-zinc-200/70 bg-white/80 px-4 py-8 text-center text-sm text-zinc-400 dark:border-white/10 dark:bg-white/5">
          No check-ins recorded yet today
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feedItems.map(f => (
            <div key={f.id} className="flex items-center gap-3.5 rounded-[20px] border border-zinc-200/70 bg-white/80 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <FeedAvatar initials={f.avatar} status={f.status} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900 dark:text-white">{f.name}</p>
                <p className="text-xs text-zinc-500 dark:text-white/40">{f.action}</p>
              </div>
              <p className="shrink-0 text-xs text-zinc-400 dark:text-white/30">{f.time}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   QUICK ACTIONS
──────────────────────────────────────────────────────────────── */
function QuickActionsPanel({ onMarkAll, onTrends }: { onMarkAll?: () => void; onTrends: () => void }) {
  const router = useRouter();
  const actions = [
    { label: 'Mark All Present', icon: <CheckCircle2 className="h-5 w-5" />, color: 'from-emerald-500/20 to-green-500/10', onClick: onMarkAll },
    { label: 'Bulk Attendance',  icon: <Users className="h-5 w-5" />,        color: 'from-sky-500/20 to-blue-500/10', onClick: onMarkAll },
    { label: 'Export CSV',       icon: <Download className="h-5 w-5" />,      color: 'from-violet-500/20 to-purple-500/10', onClick: () => window.open(`/api/attendance?format=csv&date=${new Date().toISOString().split('T')[0]}`, '_blank') },
    { label: 'Send Reminders',   icon: <Bell className="h-5 w-5" />,          color: 'from-amber-500/20 to-yellow-500/10', onClick: () => router.push('/engagement/notifications') },
    { label: 'Trends',           icon: <BarChart3 className="h-5 w-5" />,     color: 'from-rose-500/20 to-red-500/10', onClick: onTrends },
  ];
  return (
    <section className="mt-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/40">Quick actions</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">Common operations</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`group rounded-[22px] border border-zinc-200 dark:border-white/10/70 bg-gradient-to-br ${a.color} p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] dark:border-white/10`}>
            <div className="mb-4 h-10 w-10 rounded-[14px] border border-zinc-200/70 bg-white/80 flex items-center justify-center text-zinc-700 shadow-sm transition group-hover:scale-110 dark:border-white/10 dark:bg-white/10 dark:text-white/75">{a.icon}</div>
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">{a.label}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   FOOTER BAR
──────────────────────────────────────────────────────────────── */
function FooterBar({ onSync, onGenerateReport }: { onSync: () => void; onGenerateReport: () => void }) {
  return (
    <div className="sticky above-bottom-nav z-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.72))] px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3 text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div>
            <p className="text-sm font-medium">All changes saved automatically</p>
            <p className="text-xs text-white/50">Sync updates attendance records across all devices.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <HeroBtn label="Sync Devices"    icon={<Wifi className="h-4 w-4" />}           onClick={onSync} compact />
          <HeroBtn label="Generate Report" icon={<FileText className="h-4 w-4" />}       onClick={onGenerateReport} compact />
        </div>
      </div>
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
  const [entryDate, setEntryDate] = useState(date);
  const [checkIn, setCheckIn] = useState('');
  const [status, setStatus] = useState('present');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setQuery(''); setSelectedClient(null); setEntryDate(date);
      setCheckIn(''); setStatus('present'); setNotes(''); setError('');
    }
  }, [open, date]);

  const filteredClients = useMemo(() => {
    if (!query) return clients.slice(0, 8);
    return clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }, [clients, query]);

  async function handleSubmit() {
    if (!selectedClient) { setError('Select a member'); return; }
    setSaving(true);
    setError('');
    try {
      await api.attendance.mark({
        type:         'client',
        ref_id:       selectedClient.id,
        ref_name:     selectedClient.name,
        trainer_id:   selectedClient.trainer_id,
        trainer_name: selectedClient.trainer_name,
        date:         entryDate,
        check_in:     checkIn || undefined,
        status,
        notes:        notes || undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-white/50">Member</label>
            {selectedClient ? (
              <div className="mt-1.5 flex items-center justify-between rounded-[12px] border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{selectedClient.name}</span>
                <button type="button" onClick={() => setSelectedClient(null)} className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-white/40">Change</button>
              </div>
            ) : (
              <>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search member…"
                  className="mt-1.5 w-full rounded-[12px] border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
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
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-white/50">Date</label>
              <input type="date" value={entryDate} max={date} onChange={e => setEntryDate(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-white/50">Check-in time</label>
              <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                className="mt-1.5 w-full rounded-[12px] border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-white/50">Status</label>
            <div className="mt-1.5 flex gap-2">
              {(['present', 'late', 'absent'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 rounded-[10px] border px-3 py-2 text-xs font-medium capitalize transition ${
                    status === s
                      ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                      : 'border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-white/50'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-white/50">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="mt-1.5 w-full rounded-[12px] border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!selectedClient}>Save Entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────
   SHARED ATOMS
──────────────────────────────────────────────────────────────── */
function PremiumCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, hint, accent, icon, onClick, active }: {
  label: string; value: string | number; hint: string;
  accent: string; icon: React.ReactNode;
  onClick?: () => void; active?: boolean;
}) {
  const accents: Record<string, string> = {
    emerald: 'from-emerald-500/15 to-green-500/8',
    rose:    'from-rose-500/15 to-red-500/8',
    amber:   'from-amber-500/15 to-yellow-500/8',
    sky:     'from-sky-500/15 to-blue-500/8',
    violet:  'from-violet-500/15 to-purple-500/8',
    zinc:    'from-zinc-400/15 to-zinc-500/8',
  };
  return (
    <button onClick={onClick}
      className={`group rounded-[22px] border bg-gradient-to-br ${accents[accent] ?? accents.zinc} bg-white/80 p-4 shadow-sm text-left transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] dark:bg-white/5 ${
        active ? 'border-amber-400/40 ring-2 ring-amber-200/30 dark:border-amber-400/30 dark:ring-amber-900/20' : 'border-zinc-200/70 dark:border-white/10'
      }`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-9 w-9 rounded-[12px] border border-zinc-200/70 bg-white/90 flex items-center justify-center text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/70">{icon}</div>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-zinc-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-white/70">{label}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">{hint}</p>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    absent:   'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    late:     'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    unmarked: 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-white/40',
  };
  const dots: Record<string, string> = {
    present: 'bg-emerald-500', absent: 'bg-rose-500', late: 'bg-amber-500', unmarked: 'bg-zinc-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${map[status] ?? map.unmarked}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status] ?? dots.unmarked}`} />
      {status}
    </span>
  );
}

function MemberAvatar({ client, large }: { client: Client; large?: boolean }) {
  const sz = large ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  // This used to branch on photo_url and render the image with no onError, so
  // a stored path this deployment cannot serve left a broken-image icon in the
  // roster. ClientAvatar falls back to the initials instead.
  return (
    <ClientAvatar
      name={client.name}
      photoUrl={client.photo_url}
      className={`${sz} shrink-0 rounded-full bg-[linear-gradient(135deg,#F59E0B,#0067e0)] flex items-center justify-center font-semibold text-white shadow-sm`}
    />
  );
}

function FeedAvatar({ initials, status, size = 'sm' }: { initials: string; status: string; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs';
  const ringColor = status === 'present' ? 'ring-emerald-400' : status === 'late' ? 'ring-amber-400' : status === 'error' ? 'ring-rose-400' : status === 'warn' ? 'ring-amber-400' : 'ring-zinc-300';
  return (
    <div className={`${sz} shrink-0 rounded-full bg-[linear-gradient(135deg,#F59E0B,#0067e0)] flex items-center justify-center font-semibold text-white ring-2 ${ringColor}`}>
      {initials}
    </div>
  );
}

function HeroBtn({ label, icon, primary, compact, onClick, light, full }: { label: string; icon: React.ReactNode; primary?: boolean; compact?: boolean; onClick?: () => void; light?: boolean; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // h-[44px] rather than py-2.5: these sit on a hero a trainer taps at
      // arm's length, and `light` used to mean a white pill on a pale slab —
      // on the dark hero it is a translucent one, so the variant now describes
      // where it sits rather than what colour it happens to be.
      className={`inline-flex h-[44px] cursor-pointer items-center justify-center gap-2 truncate rounded-full border font-medium transition-transform active:scale-95 ${
        full ? 'w-full' : ''
      } ${compact ? 'px-3.5 text-sm' : 'px-4 text-[13px]'} ${
        primary
          ? 'border-transparent bg-[linear-gradient(135deg,#F59E0B,#D97706)] text-white shadow-[0_10px_28px_rgba(245,158,11,0.32)]'
          : light
            ? 'border-white/18 bg-white/12 text-white backdrop-blur-md'
            : 'border-white/15 bg-white/10 text-white/85 backdrop-blur-md'
      }`}>
      {icon}{label}
    </button>
  );
}

function SmBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-white/70 dark:hover:bg-white/15">
      {icon}{label}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[16px] bg-zinc-100/70 p-4 dark:bg-white/5">
          <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-2.5 w-1/4 rounded-full bg-zinc-200 dark:bg-white/10" />
          </div>
          <div className="h-8 w-24 rounded-[10px] bg-zinc-200 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: 'error' | 'success'; onClose: () => void }) {
  return (
    <div className={`mb-4 flex items-center gap-3 rounded-[16px] border px-4 py-3.5 text-sm font-medium shadow-sm ${
      type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-900/20 dark:text-emerald-300'
        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-900/20 dark:text-rose-300'
    }`}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-white/10 dark:bg-white/3">
      <div className="mb-4 text-zinc-400 dark:text-white/30">{icon}</div>
      <p className="font-semibold text-zinc-800 dark:text-white/80">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-white/40">{desc}</p>
    </div>
  );
}
