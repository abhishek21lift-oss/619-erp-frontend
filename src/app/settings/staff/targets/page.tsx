'use client';

import { useEffect, useState } from 'react';
import { api, StaffTarget, StaffMember } from '@/lib/api';
import SetTargetModal from '@/components/staff/SetTargetModal';

/* ─── Helpers ────────────────────────────────────────── */
const INR = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(0)}K`
    : `₹${n}`;

const pct = (achieved: number, target: number) =>
  target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 0;

const badge = (p: number) => {
  if (p >= 90) return { label: 'Elite', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' };
  if (p >= 70) return { label: 'On Track', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60' };
  if (p >= 40) return { label: 'Needs Push', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60' };
  return { label: 'Behind', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60' };
};

const THIS_YEAR = new Date().getFullYear();
const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(THIS_YEAR, i, 1);
  return {
    value: `${THIS_YEAR}-${String(i + 1).padStart(2, '0')}`,
    label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
});

const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

/* ─── Progress Ring ──────────────────────────────────── */
function ProgressRing({
  value,
  size = 72,
  stroke = 6,
  color = '#7c3aed',
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

/* ─── Mini Sparkline ─────────────────────────────────── */
function Sparkline({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 80,
    h = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── KPI Card ───────────────────────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  trend,
  sparkData,
  accentColor = '#7c3aed',
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: string;
  sparkData?: number[];
  accentColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/70 bg-white/70 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(99,102,241,0.12)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.13),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.08),transparent_34%)]" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <div className="rounded-xl bg-white/80 p-1.5 text-slate-500 shadow-sm">{icon}</div>
        </div>
        <p className="text-[28px] font-[750] tracking-[-0.04em] text-slate-950 [font-variant-numeric:tabular-nums]">
          {value}
        </p>
        {sparkData && (
          <div className="mt-2">
            <Sparkline data={sparkData} color={accentColor} />
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-slate-500">{sub}</span>
          {trend && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Staff Target Card ──────────────────────────────── */
function StaffTargetCard({
  t,
  onEdit,
}: {
  t: StaffTarget;
  onEdit: (t: StaffTarget) => void;
}) {
  const revPct = pct(t.achieved_revenue, t.target_revenue);
  const cliPct = pct(t.achieved_clients, t.target_clients);
  const overall = Math.round((revPct + cliPct) / 2);
  const b = badge(overall);
  const initials = t.staff_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-white/70 bg-white/72 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(99,102,241,0.10)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.10),transparent_36%)]" />
      <div className="relative">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[14px] font-bold text-white shadow-[0_6px_20px_rgba(99,102,241,0.30)]">
              {initials}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-slate-950">{t.staff_name}</p>
              <p className="text-[12px] text-slate-500">{t.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${b.cls}`}>
              {b.label}
            </span>
            <button
              onClick={() => onEdit(t)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
              aria-label="Edit target"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Metrics row */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Revenue', val: INR(t.target_revenue) },
            { label: 'Clients', val: String(t.target_clients) },
            { label: 'Achieved', val: `${overall}%` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {m.label}
              </p>
              <p className="mt-0.5 text-[17px] font-[700] tracking-[-0.03em] text-slate-950 [font-variant-numeric:tabular-nums]">
                {m.val}
              </p>
            </div>
          ))}
        </div>

        {/* Progress section */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing
              value={overall}
              size={64}
              stroke={5}
              color={overall >= 70 ? '#059669' : overall >= 40 ? '#7c3aed' : '#f59e0b'}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-[700] text-slate-800 [font-variant-numeric:tabular-nums]">
              {overall}%
            </span>
          </div>
          <div className="flex-1 space-y-2.5">
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>Revenue</span>
                <span className="font-medium text-slate-700">
                  {INR(t.achieved_revenue)} / {INR(t.target_revenue)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${revPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                <span>Clients</span>
                <span className="font-medium text-slate-700">
                  {t.achieved_clients} / {t.target_clients}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-700"
                  style={{ width: `${cliPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 px-8 py-20 text-center shadow-[0_24px_80px_rgba(99,102,241,0.09)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(167,139,250,0.18),transparent_40%),radial-gradient(ellipse_at_80%_100%,rgba(34,211,238,0.10),transparent_35%)]" />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_16px_50px_rgba(99,102,241,0.35)]">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <h2 className="text-[26px] font-[750] tracking-[-0.04em] text-slate-950">
          No targets set this month
        </h2>
        <p className="mx-auto mt-3 max-w-[38ch] text-[15px] leading-7 text-slate-500">
          Set revenue and client goals for each coach to unlock team analytics, performance
          forecasts, and achievement tracking.
        </p>
        <button
          onClick={onAdd}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-7 text-[14px] font-semibold text-white shadow-[0_12px_40px_rgba(99,102,241,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(99,102,241,0.45)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Set first monthly target
        </button>
      </div>
    </div>
  );
}

/* ─── Leaderboard ────────────────────────────────────── */
function Leaderboard({ targets }: { targets: StaffTarget[] }) {
  const sorted = [...targets]
    .sort((a, b) => {
      const pa = pct(a.achieved_revenue, a.target_revenue);
      const pb = pct(b.achieved_revenue, b.target_revenue);
      return pb - pa;
    })
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="border-b border-slate-100/80 px-5 py-4">
        <p className="text-[13px] font-semibold uppercase tracking-[0.10em] text-slate-500">Leaderboard</p>
      </div>
      <div className="divide-y divide-slate-100/60">
        {sorted.map((t, i) => {
          const p = pct(t.achieved_revenue, t.target_revenue);
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="w-5 text-center text-[14px]">
                {medals[i] ?? (
                  <span className="text-[12px] font-semibold text-slate-400">{i + 1}</span>
                )}
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-[11px] font-bold text-white">
                {t.staff_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-slate-900">{t.staff_name}</p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                    style={{
                      width: `${p}%`,
                      transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </div>
              </div>
              <span className="text-[13px] font-[700] text-slate-700 [font-variant-numeric:tabular-nums]">
                {p}%
              </span>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="px-5 py-8 text-center text-[13px] text-slate-400">No data yet</p>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function StaffTargetsPage() {
  const [targets, setTargets] = useState<StaffTarget[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffTarget | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        api.staff.targets.list({ month }),
        api.staff.list(),
      ]);
      setTargets(Array.isArray(t) ? t : []);
      setStaff(Array.isArray(s) ? s : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const totalRevTarget = targets.reduce((s, t) => s + (t.target_revenue ?? 0), 0);
  const totalRevAchieved = targets.reduce((s, t) => s + (t.achieved_revenue ?? 0), 0);
  const overallPct = pct(totalRevAchieved, totalRevTarget);
  // Sparkline = actual per-staff revenue achievement % (real data, not fabricated history)
  const staffRevPcts = targets.map(t => pct(t.achieved_revenue, t.target_revenue));
  const sparkRevData = staffRevPcts.length > 0 ? staffRevPcts : [0];
  const staffCliPcts = targets.map(t => pct(t.achieved_clients, t.target_clients));
  const sparkCliData = staffCliPcts.length > 0 ? staffCliPcts : [0];
  const bestPerformer = [...targets].sort(
    (a, b) =>
      pct(b.achieved_revenue, b.target_revenue) - pct(a.achieved_revenue, a.target_revenue)
  )[0];
  const pendingTargets = Math.max(staff.length - targets.length, 0);

  const handleEdit = (t: StaffTarget) => {
    setEditTarget(t);
    setModalOpen(true);
  };
  const handleAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const handleSaved = () => {
    setModalOpen(false);
    setEditTarget(null);
    load();
  };

  return (
    <main className="min-h-screen bg-[#f4f5fb]">
      <div className="mx-auto max-w-[1560px] px-4 py-6 lg:px-8">

        {/* ── Header ── */}
        <section className="mb-6 overflow-hidden rounded-[26px] border border-white/70 bg-white/70 px-6 py-5 shadow-[0_16px_50px_rgba(99,102,241,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700 ring-1 ring-violet-200/60">
                Performance Management
              </span>
              <h1 className="mt-2 text-[28px] font-[750] tracking-[-0.04em] text-slate-950">
                Staff Targets
              </h1>
              <p className="mt-1 text-[14px] text-slate-500">
                Track monthly goals and execution quality across your coaching team.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-11 rounded-full border border-white/70 bg-white/80 px-4 text-[14px] font-medium text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_6px_20px_rgba(15,23,42,.06)] backdrop-blur focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 text-[14px] font-semibold text-white shadow-[0_10px_36px_rgba(99,102,241,0.32)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(99,102,241,0.42)]"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Set Target
              </button>
            </div>
          </div>
        </section>

        {/* ── KPI Grid ── */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard
            label="Total Revenue Target"
            value={INR(totalRevTarget)}
            sub="This month"
            trend={overallPct >= 80 ? '↑ strong' : overallPct >= 50 ? '→ on track' : '↓ needs push'}
            sparkData={sparkRevData}
            accentColor="#7c3aed"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />
          <KpiCard
            label="Achievement Rate"
            value={`${overallPct}%`}
            sub="Revenue achieved"
            trend={overallPct >= 60 ? 'On track' : 'Needs review'}
            sparkData={sparkCliData}
            accentColor="#059669"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            }
          />
          <KpiCard
            label="Active Targets"
            value={String(targets.length)}
            sub={`of ${staff.length} staff`}
            accentColor="#6366f1"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            }
          />
          <KpiCard
            label="Best Performer"
            value={bestPerformer ? bestPerformer.staff_name.split(' ')[0] : '—'}
            sub={
              bestPerformer
                ? `${pct(bestPerformer.achieved_revenue, bestPerformer.target_revenue)}% achieved`
                : 'No data'
            }
            accentColor="#0891b2"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
              </svg>
            }
          />
          <KpiCard
            label="Pending Targets"
            value={String(pendingTargets)}
            sub="Staff without targets"
            accentColor="#d97706"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <KpiCard
            label="Team Score"
            value={
              targets.length
                ? String(
                    Math.round(
                      targets.reduce(
                        (s, t) => s + pct(t.achieved_revenue, t.target_revenue),
                        0
                      ) / targets.length
                    )
                  )
                : '—'
            }
            sub="Avg performance index"
            trend={overallPct >= 60 ? '↑ improving' : '→ steady'}
            accentColor="#7c3aed"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            }
          />
        </section>

        {/* ── Main Content ── */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-[22px] bg-white/60" />
            ))}
          </div>
        ) : targets.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            {/* Staff Cards Grid */}
            <div className="grid gap-4 content-start md:grid-cols-2">
              {targets.map((t) => (
                <StaffTargetCard key={t.id} t={t} onEdit={handleEdit} />
              ))}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              <Leaderboard targets={targets} />

              {/* AI Insight */}
              <div className="overflow-hidden rounded-[22px] border border-cyan-200/60 bg-gradient-to-br from-cyan-50/80 to-violet-50/60 p-5 shadow-[0_10px_30px_rgba(6,182,212,0.08)] backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="rounded-xl bg-cyan-500/15 p-1.5 text-cyan-700">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-700">
                    AI Performance Insight
                  </p>
                </div>
                <p className="text-[13px] leading-6 text-slate-600">
                  {overallPct >= 70
                    ? `Team is performing strongly at ${overallPct}% — top performers are pulling the average up. Consider increasing targets by 10–15% next month.`
                    : overallPct >= 40
                    ? `Team is at ${overallPct}% — mid-month pace suggests a strong finish is achievable. Focus on coaches currently below 50%.`
                    : `Team is at ${overallPct}% for the month. Recommend a mid-month check-in to realign expectations and clear blockers.`}
                </p>
              </div>

              {/* Monthly Summary */}
              <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.10em] text-slate-500">
                  Monthly Summary
                </p>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Revenue collected',
                      value: INR(totalRevAchieved),
                      of: INR(totalRevTarget),
                    },
                    {
                      label: 'Clients active',
                      value: String(targets.reduce((s, t) => s + (t.achieved_clients ?? 0), 0)),
                      of: String(targets.reduce((s, t) => s + (t.target_clients ?? 0), 0)),
                    },
                    {
                      label: 'Sessions done',
                      value: String(targets.reduce((s, t) => s + (t.achieved_sessions ?? 0), 0)),
                      of: String(targets.reduce((s, t) => s + (t.target_sessions ?? 0), 0)),
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[13px] text-slate-500">{row.label}</span>
                      <span className="text-[14px] font-semibold text-slate-900 [font-variant-numeric:tabular-nums]">
                        {row.value}{' '}
                        <span className="text-[12px] font-normal text-slate-400">/ {row.of}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <SetTargetModal
          staff={staff}
          editTarget={editTarget}
          month={month}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
