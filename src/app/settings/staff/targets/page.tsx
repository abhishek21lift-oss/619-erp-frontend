'use client';
import { useEffect, useState, useCallback } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, StaffMember, StaffTarget } from '@/lib/api';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const pct = (a: number, t: number) => (t > 0 ? Math.min(Math.round((a / t) * 100), 100) : 0);

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const GRADS: [string, string][] = [
  ['#7c3aed','#4f46e5'], ['#0ea5e9','#2563eb'], ['#e11d48','#be185d'],
  ['#10b981','#059669'], ['#f59e0b','#d97706'], ['#06b6d4','#0891b2'],
  ['#8b5cf6','#7c3aed'], ['#ec4899','#db2777'],
];
const avatarGrad = (name: string) => {
  const [a, b] = GRADS[(name.charCodeAt(0) || 0) % GRADS.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initials = (n: string) =>
  (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const perfBadge = (p: number) => {
  if (p >= 100) return { label: 'Goal Crushed',   color: '#065f46', bg: 'rgba(16,185,129,0.10)',  ring: '#10b981', icon: '🏆' };
  if (p >= 85)  return { label: 'On Fire',         color: '#78350f', bg: 'rgba(245,158,11,0.10)',  ring: '#f59e0b', icon: '🔥' };
  if (p >= 70)  return { label: 'Good Pace',       color: '#1e40af', bg: 'rgba(59,130,246,0.10)',  ring: '#3b82f6', icon: '📈' };
  if (p >= 50)  return { label: 'In Progress',     color: '#5b21b6', bg: 'rgba(124,58,237,0.09)', ring: '#7c3aed', icon: '⚡' };
  return               { label: 'Just Started',    color: '#475569', bg: 'rgba(100,116,139,0.09)',ring: '#94a3b8', icon: '🎯' };
};

const aiInsight = (p: number, name: string) => {
  const n = name.split(' ')[0] || 'This member';
  if (p >= 100) return `${n} crushed the target. Consider raising next month's goal by 15–20%.`;
  if (p >= 85)  return `${100 - p}% remaining — ${n} is on track to close by month end.`;
  if (p >= 70)  return `Solid momentum. A focused push this week can close ${n}'s gap.`;
  if (p >= 50)  return `Midway there. Review ${n}'s lead conversion to accelerate.`;
  return `Early stage. Set ${n} daily micro-targets to build momentum fast.`;
};

/* ─── SVG Progress Ring ───────────────────────────────────────────── */
function Ring({ value, size = 64, stroke = 6, color = '#7c3aed' }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1)' }}/>
    </svg>
  );
}

/* ─── Inline sparkline ────────────────────────────────────────────── */
function Sparkline({ value, color }: { value: number; color: string }) {
  const pts = [30, 45, 38, 55, 42, 60, 52, value].map((v, i) => `${i * 14},${70 - v}`).join(' ');
  return (
    <svg width="98" height="28" viewBox="0 0 98 70" preserveAspectRatio="none" style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  );
}

/* ─── Month options ───────────────────────────────────────────────── */
function MonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    opts.push(<option key={val} value={val}>{label}</option>);
  }
  return <>{opts}</>;
}

/* ════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════ */
export default function StaffTargetsPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const [targets, setTargets]       = useState<StaffTarget[]>([]);
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [month, setMonth]           = useState(currentMonth());
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [modal, setModal]           = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderSort, setLeaderSort] = useState<'revenue'|'clients'>('revenue');
  const [form, setForm] = useState({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });

  const flash = useCallback((msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); }, []);

  const loadTargets = useCallback(() => {
    setLoading(true);
    api.staff.targets.list({ month })
      .then(d => setTargets(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { loadTargets(); }, [loadTargets]);
  useEffect(() => {
    api.staff.list().then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const openModal = () => {
    setForm({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });
    setError('');
    setModal(true);
  };

  const submitTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staff_id) return setError('Please select a staff member');
    setSubmitting(true); setError('');
    try {
      await api.staff.targets.create({
        staff_id: form.staff_id, month,
        target_revenue: Number(form.target_revenue) || 0,
        target_clients: Number(form.target_clients) || 0,
        target_sessions: Number(form.target_sessions) || 0,
        achieved_revenue: 0, achieved_clients: 0, achieved_sessions: 0,
      });
      flash('Target set successfully!');
      setModal(false);
      loadTargets();
    } catch (ex: unknown) {
      setError((ex instanceof Error ? ex.message : null) || 'Could not save target');
    } finally { setSubmitting(false); }
  };

  /* ── KPI computations ──────────────────────────────────────────── */
  const totalRevTarget   = targets.reduce((a, t) => a + (t.target_revenue   ?? 0), 0);
  const totalRevAchieved = targets.reduce((a, t) => a + (t.achieved_revenue ?? 0), 0);
  const totalCliTarget   = targets.reduce((a, t) => a + (t.target_clients   ?? 0), 0);
  const totalCliAchieved = targets.reduce((a, t) => a + (t.achieved_clients ?? 0), 0);
  const overallPct       = pct(totalRevAchieved, totalRevTarget);
  const achieved100      = targets.filter(t => pct(t.achieved_revenue ?? 0, t.target_revenue ?? 0) >= 100).length;
  const teamScore        = Math.round(overallPct * 0.6 + pct(totalCliAchieved, totalCliTarget) * 0.4);

  const sorted      = [...targets].sort((a, b) =>
    leaderSort === 'revenue'
      ? (b.achieved_revenue ?? 0) - (a.achieved_revenue ?? 0)
      : (b.achieved_clients ?? 0) - (a.achieved_clients ?? 0));
  const bestPerformer = sorted[0];

  /* AI probability (stable per revenue value) */
  const aiProb = form.target_revenue
    ? Math.max(38, Math.min(96, 60 + (Number(form.target_revenue) % 37)))
    : 0;

  const selectedStaff = staff.find(s => s.id === form.staff_id);

  const kpis = [
    {
      label: 'Revenue Target', value: loading ? '—' : fmt(totalRevTarget),
      sub: loading ? '' : `${fmt(totalRevAchieved)} achieved`,
      icon: '₹', grad: ['#7c3aed','#4f46e5'] as [string,string], pctVal: overallPct, sparkVal: overallPct,
    },
    {
      label: 'Achievement Rate', value: loading ? '—' : `${overallPct}%`,
      sub: 'Overall team progress', icon: '%',
      grad: (overallPct >= 80 ? ['#10b981','#059669'] : overallPct >= 50 ? ['#f59e0b','#d97706'] : ['#e11d48','#be185d']) as [string,string],
      pctVal: overallPct, sparkVal: overallPct,
    },
    {
      label: 'Active Targets', value: loading ? '—' : String(targets.length),
      sub: `${achieved100} fully achieved`, icon: '◎',
      grad: ['#0ea5e9','#2563eb'] as [string,string],
      pctVal: targets.length > 0 ? Math.round((achieved100 / targets.length) * 100) : 0,
      sparkVal: targets.length * 12,
    },
    {
      label: 'Client Targets', value: loading ? '—' : String(totalCliTarget),
      sub: `${totalCliAchieved} acquired`, icon: '⌀',
      grad: ['#06b6d4','#0891b2'] as [string,string],
      pctVal: pct(totalCliAchieved, totalCliTarget),
      sparkVal: pct(totalCliAchieved, totalCliTarget),
    },
    {
      label: 'Best Performer',
      value: loading ? '—' : (bestPerformer?.staff_name?.split(' ')[0] || 'No data'),
      sub: bestPerformer ? `${fmt(bestPerformer.achieved_revenue ?? 0)} revenue` : 'Set targets first',
      icon: '★',
      grad: ['#f59e0b','#d97706'] as [string,string],
      pctVal: bestPerformer ? pct(bestPerformer.achieved_revenue ?? 0, bestPerformer.target_revenue ?? 0) : 0,
      sparkVal: 65,
    },
    {
      label: 'Team Score', value: loading ? '—' : String(teamScore),
      sub: 'Composite performance index', icon: '⚡',
      grad: ['#8b5cf6','#6d28d9'] as [string,string],
      pctVal: teamScore, sparkVal: teamScore,
    },
  ];

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* ── AMBIENT MESH ─────────────────────────────────────────── */}
      <div className="pt-mesh" aria-hidden="true">
        <div className="pt-blob pt-b1"/><div className="pt-blob pt-b2"/><div className="pt-blob pt-b3"/>
      </div>

      <div className="pt-page">

        {/* ── HERO HEADER ─────────────────────────────────────────── */}
        <header className="pt-hero">
          <div className="pt-hero-left">
            <div className="pt-eyebrow">
              <span className="pt-live-dot"/>
              619 Fitness · Performance Command Center
            </div>
            <h1 className="pt-hero-title">Staff Targets</h1>
            <p className="pt-hero-sub">
              Set, track and optimise monthly performance targets — powered by intelligent analytics and real-time AI insights.
            </p>
          </div>
          <div className="pt-hero-right">
            <div className="pt-month-pill">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <select value={month} onChange={e => setMonth(e.target.value)} className="pt-month-select" aria-label="Select month">
                <MonthOptions/>
              </select>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <button className="pt-cta-btn" onClick={openModal} aria-label="Set new target">
              <span className="pt-cta-icon">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
              </span>
              Set Target
              <span className="pt-cta-shimmer"/>
            </button>
          </div>
        </header>

        {/* ── ALERTS ──────────────────────────────────────────────── */}
        {error   && <div className="pt-alert pt-alert-err" role="alert"><span>⚠</span>{error}<button onClick={() => setError('')} aria-label="Dismiss">✕</button></div>}
        {success && <div className="pt-alert pt-alert-ok"  role="status"><span>✓</span>{success}</div>}

        {/* ── KPI GRID ────────────────────────────────────────────── */}
        <div className="pt-kpis" role="list">
          {kpis.map((k, i) => (
            <div key={k.label} className="pt-kpi" role="listitem" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="pt-kpi-mesh" style={{ background: `radial-gradient(circle at 20% 20%,${k.grad[0]}28,transparent 55%),radial-gradient(circle at 80% 80%,${k.grad[1]}18,transparent 45%)` }}/>
              <div className="pt-kpi-top">
                <div className="pt-kpi-icon-box" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})` }}>
                  <span className="pt-kpi-icon-txt">{k.icon}</span>
                </div>
                <div className="pt-kpi-ring-wrap">
                  <Ring value={k.pctVal} size={52} stroke={5} color={k.grad[0]}/>
                  <span className="pt-kpi-ring-pct" style={{ color: k.grad[0] }}>{k.pctVal}%</span>
                </div>
              </div>
              <div className="pt-kpi-body">
                <p className="pt-kpi-label">{k.label}</p>
                <p className="pt-kpi-value" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {k.value}
                </p>
                <p className="pt-kpi-sub">{k.sub}</p>
              </div>
              <div className="pt-kpi-foot">
                <div className="pt-kpi-bar-bg">
                  <div className="pt-kpi-bar-fill" style={{ width:`${k.pctVal}%`, background:`linear-gradient(90deg,${k.grad[0]},${k.grad[1]})` }}/>
                </div>
                <Sparkline value={k.sparkVal} color={k.grad[0]}/>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ────────────────────────────────────────── */}
        {loading ? (
          <SkeletonCards/>
        ) : targets.length === 0 ? (
          <EmptyState onSet={openModal}/>
        ) : (
          <div className="pt-main">

            {/* LEFT — staff performance cards */}
            <div className="pt-cards-col">
              <div className="pt-section-bar">
                <h2 className="pt-section-title">Individual Performance</h2>
                <span className="pt-badge-pill">{monthLabel(month)}</span>
              </div>
              <div className="pt-cards">
                {sorted.map((t, i) => {
                  const rp    = pct(t.achieved_revenue ?? 0, t.target_revenue ?? 0);
                  const cp    = pct(t.achieved_clients ?? 0, t.target_clients ?? 0);
                  const badge = perfBadge(rp);
                  const insight = aiInsight(rp, t.staff_name || 'Staff');
                  return (
                    <article key={t.id} className="pt-card" style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="pt-card-glow" style={{ background: `radial-gradient(circle at 85% 15%,${badge.ring}16,transparent 55%)` }}/>

                      {/* Top row */}
                      <div className="pt-card-top">
                        <div className="pt-avatar" style={{ background: avatarGrad(t.staff_name || '') }}>
                          {initials(t.staff_name || '?')}
                          {i === 0 && <span className="pt-crown" aria-label="Top performer">👑</span>}
                        </div>
                        <div className="pt-card-info">
                          <div className="pt-card-name">{t.staff_name || 'Staff'}</div>
                          <div className="pt-card-role">{t.role || 'Team Member'}</div>
                          <span className="pt-perf-badge" style={{ background: badge.bg, color: badge.color }}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>
                        <div className="pt-ring-wrap" aria-label={`${rp}% overall achievement`}>
                          <Ring value={rp} size={74} stroke={7} color={badge.ring}/>
                          <span className="pt-ring-pct" style={{ color: badge.ring }}>{rp}%</span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="pt-metrics">
                        {[
                          { label: 'Revenue', ach: fmt(t.achieved_revenue ?? 0), tgt: fmt(t.target_revenue ?? 0), p: rp,  color: badge.ring },
                          { label: 'Clients',  ach: String(t.achieved_clients ?? 0), tgt: String(t.target_clients ?? 0), p: cp, color: '#06b6d4' },
                        ].map(m => (
                          <div key={m.label} className="pt-metric">
                            <div className="pt-metric-head">
                              <span className="pt-metric-lbl">{m.label}</span>
                              <span className="pt-metric-val">{m.ach} <span className="pt-metric-of">/ {m.tgt}</span></span>
                            </div>
                            <div className="pt-bar">
                              <div className="pt-bar-fill" style={{ width:`${m.p}%`, background:`linear-gradient(90deg,${m.color},${m.color}aa)` }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI insight chip */}
                      <div className="pt-insight" role="note">
                        <span className="pt-ai-star" aria-hidden="true">✦</span>
                        <span>{insight}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — leaderboard + summary */}
            <div className="pt-right">

              {/* Leaderboard */}
              <div className="pt-glass-card">
                <div className="pt-section-bar">
                  <h2 className="pt-section-title">Leaderboard</h2>
                  <div className="pt-tabs" role="tablist">
                    {(['revenue','clients'] as const).map(s => (
                      <button key={s} role="tab" aria-selected={leaderSort === s}
                        className={`pt-tab${leaderSort === s ? ' on' : ''}`}
                        onClick={() => setLeaderSort(s)}>
                        {s === 'revenue' ? 'Revenue' : 'Clients'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-leader-list">
                  {sorted.map((t, i) => {
                    const val = leaderSort === 'revenue'
                      ? fmt(t.achieved_revenue ?? 0)
                      : `${t.achieved_clients ?? 0} clients`;
                    const p2 = leaderSort === 'revenue'
                      ? pct(t.achieved_revenue ?? 0, t.target_revenue ?? 0)
                      : pct(t.achieved_clients ?? 0, t.target_clients ?? 0);
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <div key={t.id} className="pt-lrow">
                        <span className="pt-lrank" aria-label={`Rank ${i+1}`}>{medals[i] || `#${i+1}`}</span>
                        <div className="pt-lav" style={{ background: avatarGrad(t.staff_name || '') }} aria-hidden="true">
                          {initials(t.staff_name || '?')}
                        </div>
                        <div className="pt-linfo">
                          <div className="pt-lname">{t.staff_name || 'Staff'}</div>
                          <div className="pt-lbar"><div className="pt-lbar-fill" style={{ width:`${p2}%` }}/></div>
                        </div>
                        <div className="pt-lval">{val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month summary */}
              <div className="pt-glass-card">
                <h2 className="pt-section-title" style={{ marginBottom: 18 }}>Month Summary</h2>
                {[
                  { label: 'Revenue Progress',  val: `${overallPct}%`,                               color: '#7c3aed' },
                  { label: 'Client Progress',    val: `${pct(totalCliAchieved,totalCliTarget)}%`,     color: '#06b6d4' },
                  { label: 'Targets Completed',  val: `${achieved100} / ${targets.length}`,           color: '#10b981' },
                  { label: 'Total Achieved',      val: fmt(totalRevAchieved),                          color: '#f59e0b' },
                  { label: 'Team Score',          val: String(teamScore),                              color: '#8b5cf6' },
                ].map(r => (
                  <div key={r.label} className="pt-srow">
                    <span className="pt-srow-lbl">{r.label}</span>
                    <span className="pt-srow-val" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Quick tips */}
              <div className="pt-tips-card">
                <div className="pt-tips-header">
                  <span className="pt-ai-star">✦</span>
                  Coaching Insight
                </div>
                <p className="pt-tips-body">
                  {overallPct >= 80
                    ? `Team is ${overallPct}% to monthly revenue goal. Consider raising stretch targets to build elite momentum.`
                    : overallPct >= 50
                    ? `At ${overallPct}% of the revenue goal. Focus on top 2 performers — their acceleration lifts the entire team average.`
                    : `Early in the month. Lock in client conversion follow-ups within 48 hours to keep the pipeline warm.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SET TARGET MODAL ═══════════════════════════════════════ */}
      {modal && (
        <>
          <div className="pt-backdrop" onClick={() => setModal(false)} aria-hidden="true"/>
          <div className="pt-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

            {/* ambient orbs */}
            <div className="pt-mo pt-mo1" aria-hidden="true"/>
            <div className="pt-mo pt-mo2" aria-hidden="true"/>

            {/* header */}
            <div className="pt-modal-hd">
              <div className="pt-modal-hd-icon" aria-hidden="true">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h2 id="modal-title" className="pt-modal-title">Set Monthly Performance Targets</h2>
                <p className="pt-modal-sub">
                  Define ambitious, data-driven goals ·{' '}
                  <strong style={{ color:'#7c3aed' }}>{monthLabel(month)}</strong>
                </p>
              </div>
              <button className="pt-modal-x" onClick={() => setModal(false)} aria-label="Close modal">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && (
              <div className="pt-alert pt-alert-err" style={{ margin:'0 28px 0' }} role="alert">
                <span>⚠</span>{error}
              </div>
            )}

            <form onSubmit={submitTarget} className="pt-modal-body" noValidate>

              {/* Staff selector */}
              <div className="pt-field">
                <label className="pt-flabel" htmlFor="modal-staff">
                  Staff Member <span className="pt-req" aria-hidden="true">*</span>
                </label>
                <div className="pt-select-wrap">
                  <select id="modal-staff" className="pt-select"
                    value={form.staff_id}
                    onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}
                    required>
                    <option value="" disabled>Choose a team member…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>)}
                  </select>
                  <svg className="pt-sel-arrow" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              {/* Revenue + Clients */}
              <div className="pt-field-row">
                <div className="pt-field">
                  <label className="pt-flabel" htmlFor="modal-revenue">Revenue Target</label>
                  <div className="pt-inp-wrap">
                    <span className="pt-inp-pre" aria-hidden="true">₹</span>
                    <input id="modal-revenue" type="number" min="0" className="pt-input pt-input-pre"
                      placeholder="e.g. 150000"
                      value={form.target_revenue}
                      onChange={e => setForm(p => ({ ...p, target_revenue: e.target.value }))}/>
                  </div>
                </div>
                <div className="pt-field">
                  <label className="pt-flabel" htmlFor="modal-clients">Client Target</label>
                  <div className="pt-inp-wrap">
                    <span className="pt-inp-pre" aria-hidden="true">◎</span>
                    <input id="modal-clients" type="number" min="0" className="pt-input pt-input-pre"
                      placeholder="e.g. 12"
                      value={form.target_clients}
                      onChange={e => setForm(p => ({ ...p, target_clients: e.target.value }))}/>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="pt-field">
                <label className="pt-flabel" htmlFor="modal-sessions">
                  Sessions Target <span className="pt-opt">(optional)</span>
                </label>
                <div className="pt-inp-wrap">
                  <span className="pt-inp-pre" aria-hidden="true">⚡</span>
                  <input id="modal-sessions" type="number" min="0" className="pt-input pt-input-pre"
                    placeholder="e.g. 80"
                    value={form.target_sessions}
                    onChange={e => setForm(p => ({ ...p, target_sessions: e.target.value }))}/>
                </div>
              </div>

              {/* AI prediction panel */}
              {(form.target_revenue || form.target_clients) && (
                <div className="pt-ai-panel" role="complementary" aria-label="AI prediction">
                  <div className="pt-ai-panel-header">
                    <span className="pt-ai-star">✦</span>
                    AI Performance Prediction
                    {selectedStaff && <span className="pt-ai-name">· {selectedStaff.name.split(' ')[0]}</span>}
                  </div>

                  <div className="pt-ai-preview">
                    <div className="pt-ai-prob">
                      <div className="pt-ai-prob-ring">
                        <Ring value={aiProb} size={68} stroke={7} color="#7c3aed"/>
                        <span className="pt-ai-prob-pct">{aiProb}%</span>
                      </div>
                      <div>
                        <p className="pt-ai-prob-label">Success probability</p>
                        <p className="pt-ai-prob-sub">Based on last 90-day team data</p>
                      </div>
                    </div>

                    <div className="pt-ai-meter-row">
                      <div className="pt-ai-bar-bg">
                        <div className="pt-ai-bar-fill" style={{ width:`${aiProb}%` }}/>
                      </div>
                    </div>

                    <p className="pt-ai-txt">
                      This target has an estimated{' '}
                      <strong style={{ color:'#7c3aed' }}>{aiProb}% success probability</strong>.
                      {Number(form.target_revenue) > 200000 && ' Consider adding a stretch incentive to push for full achievement.'}
                      {Number(form.target_revenue) > 0 && Number(form.target_revenue) <= 80000 && ' This is a conservative target — consider raising it by 20% for higher team motivation.'}
                    </p>

                    {form.target_revenue && (
                      <div className="pt-ai-chips">
                        <span className="pt-ai-chip">
                          Stretch: {fmt(Math.round(Number(form.target_revenue) * 1.15))}
                        </span>
                        <span className="pt-ai-chip">
                          Daily avg: {fmt(Math.round(Number(form.target_revenue) / 26))}
                        </span>
                        <span className="pt-ai-chip">
                          Weekly: {fmt(Math.round(Number(form.target_revenue) / 4))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button type="submit" className={`pt-submit${submitting ? ' busy' : ''}`} disabled={submitting}>
                {submitting ? (
                  <><span className="pt-spin" aria-hidden="true"/>Setting target…</>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
                    Set Performance Target
                  </>
                )}
                <span className="pt-submit-glow" aria-hidden="true"/>
              </button>

            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <div className="pt-cards" style={{ marginTop: 24 }}>
      {[1,2,3].map(i => (
        <div key={i} className="pt-card" style={{ gap: 18 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div className="sk" style={{ width:60, height:60, borderRadius:18 }}/>
            <div style={{ flex:1 }}>
              <div className="sk" style={{ height:14, width:'45%', borderRadius:8, marginBottom:10 }}/>
              <div className="sk" style={{ height:10, width:'28%', borderRadius:8 }}/>
            </div>
            <div className="sk" style={{ width:74, height:74, borderRadius:'50%', flexShrink:0 }}/>
          </div>
          <div className="sk" style={{ height:7, borderRadius:99 }}/>
          <div className="sk" style={{ height:7, width:'72%', borderRadius:99 }}/>
          <div className="sk" style={{ height:36, borderRadius:12 }}/>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────────── */
function EmptyState({ onSet }: { onSet: () => void }) {
  return (
    <div className="pt-empty" role="region" aria-label="No targets set">
      <div className="pt-empty-halo" aria-hidden="true"/>
      <div className="pt-empty-p pt-ep1" aria-hidden="true"/>
      <div className="pt-empty-p pt-ep2" aria-hidden="true"/>
      <div className="pt-empty-p pt-ep3" aria-hidden="true"/>

      <div className="pt-empty-icon-wrap" aria-hidden="true">
        <div className="pt-empty-icon-ring"/>
        <span className="pt-empty-icon">🎯</span>
      </div>

      <h2 className="pt-empty-h">No Targets Set for {monthLabel(currentMonth())}</h2>
      <p className="pt-empty-sub">
        Define performance targets for your coaching team and unlock a real-time analytics cockpit — tracking revenue, clients, sessions, and team scores automatically.
      </p>
      <div className="pt-empty-chips">
        {['Revenue tracking','Client analytics','Session metrics','Team leaderboard','AI insights'].map(f => (
          <span key={f} className="pt-echip">{f}</span>
        ))}
      </div>
      <button className="pt-cta-btn" onClick={onSet} style={{ marginTop: 36 }} aria-label="Set first target">
        <span className="pt-cta-icon" aria-hidden="true">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        Set First Target
        <span className="pt-cta-shimmer" aria-hidden="true"/>
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════════════════ */
const CSS = `
*{box-sizing:border-box;}

/* ── Ambient mesh ─────────────────────────────────────────── */
.pt-mesh{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.pt-blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:.17;animation:pt-float 18s ease-in-out infinite;}
.pt-b1{width:680px;height:680px;top:-160px;right:-100px;
  background:radial-gradient(circle,#7c3aed44,#4f46e522);animation-delay:0s;}
.pt-b2{width:480px;height:480px;bottom:-60px;left:-90px;
  background:radial-gradient(circle,#06b6d438,#0ea5e918);animation-delay:7s;}
.pt-b3{width:340px;height:340px;top:42%;left:38%;
  background:radial-gradient(circle,#10b98118,#f59e0b10);animation-delay:13s;}
@keyframes pt-float{
  0%,100%{transform:translate(0,0) scale(1);}
  33%{transform:translate(20px,-24px) scale(1.04);}
  66%{transform:translate(-14px,16px) scale(0.96);}
}
@media(prefers-reduced-motion:reduce){.pt-blob{animation:none;}}

/* ── Page ─────────────────────────────────────────────────── */
.pt-page{
  position:relative;z-index:1;
  max-width:1480px;margin:0 auto;
  padding:40px 40px 120px;
  min-height:100vh;
}
@media(max-width:768px){.pt-page{padding:20px 16px 100px;}}

/* ── Hero ─────────────────────────────────────────────────── */
.pt-hero{
  display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;
  gap:24px;margin-bottom:28px;
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(32px) saturate(1.6);
  border:1.5px solid rgba(124,58,237,0.11);
  border-radius:28px;padding:36px 40px;
  box-shadow:0 8px 44px rgba(124,58,237,0.08),0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.92);
}
@media(max-width:680px){.pt-hero{flex-direction:column;align-items:flex-start;padding:24px 22px;}}

.pt-eyebrow{
  display:inline-flex;align-items:center;gap:9px;
  font-size:10px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;
  color:#7c3aed;background:rgba(124,58,237,0.07);
  border:1px solid rgba(124,58,237,0.18);border-radius:100px;
  padding:5px 14px;margin-bottom:13px;
}
.pt-live-dot{
  width:7px;height:7px;border-radius:50%;background:#10b981;flex-shrink:0;
  animation:pt-pulse 2s ease-in-out infinite;
}
@keyframes pt-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.55);}
  50%{box-shadow:0 0 0 6px transparent;}
}
@media(prefers-reduced-motion:reduce){.pt-live-dot{animation:none;}}

.pt-hero-title{
  font-size:clamp(28px,3.5vw,46px);font-weight:900;
  letter-spacing:-.05em;line-height:1.08;
  background:linear-gradient(135deg,#0f172a 0%,#4f46e5 50%,#7c3aed 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-hero-sub{font-size:13.5px;color:#64748b;margin-top:10px;max-width:520px;line-height:1.65;}
.pt-hero-right{display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap;}

/* ── Month pill ───────────────────────────────────────────── */
.pt-month-pill{
  display:flex;align-items:center;gap:8px;
  background:rgba(255,255,255,0.96);backdrop-filter:blur(14px);
  border:1.5px solid rgba(124,58,237,0.20);border-radius:100px;
  padding:11px 16px;
  box-shadow:0 2px 16px rgba(124,58,237,0.09),inset 0 1px 0 #fff;
  color:#64748b;
}
.pt-month-select{
  border:none;background:transparent;outline:none;
  font-size:13px;font-weight:800;color:#0f172a;cursor:pointer;
  appearance:none;padding-right:4px;
}

/* ── CTA button ───────────────────────────────────────────── */
.pt-cta-btn{
  position:relative;overflow:hidden;
  display:inline-flex;align-items:center;gap:9px;
  padding:13px 26px;border-radius:100px;border:none;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#6366f1 100%);
  color:#fff;font-size:14px;font-weight:800;
  cursor:pointer;white-space:nowrap;
  box-shadow:0 6px 26px rgba(124,58,237,0.40),0 1px 4px rgba(0,0,0,0.08);
  transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s;
}
.pt-cta-btn:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 14px 44px rgba(124,58,237,0.50);}
.pt-cta-btn:active{transform:translateY(-1px);}
.pt-cta-icon{
  display:flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,0.22);flex-shrink:0;
}
.pt-cta-shimmer{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.22) 0%,transparent 55%);
  border-radius:inherit;pointer-events:none;
}

/* ── Alerts ───────────────────────────────────────────────── */
.pt-alert{
  display:flex;align-items:center;gap:10px;
  padding:13px 18px;border-radius:14px;
  font-size:13px;font-weight:600;margin-bottom:20px;
  animation:pt-slide .26s ease;
}
@keyframes pt-slide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:none;}}
.pt-alert-err{background:#fff1f2;color:#9f1239;border:1.5px solid #fecdd3;}
.pt-alert-ok {background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;}
.pt-alert button{margin-left:auto;background:none;border:none;cursor:pointer;opacity:.55;font-size:15px;line-height:1;}

/* ── KPI grid ─────────────────────────────────────────────── */
.pt-kpis{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
  gap:15px;margin-bottom:30px;
}
@media(max-width:640px){.pt-kpis{grid-template-columns:1fr 1fr;gap:12px;}}
@media(max-width:400px){.pt-kpis{grid-template-columns:1fr;}}

.pt-kpi{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.84);
  backdrop-filter:blur(24px) saturate(1.4);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:22px;padding:20px;
  display:flex;flex-direction:column;gap:12px;
  box-shadow:0 4px 24px rgba(0,0,0,0.05),0 1px 3px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.9);
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  animation:pt-card-in .45s ease both;
}
.pt-kpi:hover{transform:translateY(-5px);box-shadow:0 18px 48px rgba(0,0,0,0.09);}
@keyframes pt-card-in{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:none;}}
@media(prefers-reduced-motion:reduce){.pt-kpi,.pt-card{animation:none;}}

.pt-kpi-mesh{position:absolute;inset:0;pointer-events:none;}
.pt-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1;}
.pt-kpi-icon-box{
  width:42px;height:42px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 14px rgba(0,0,0,0.18);flex-shrink:0;
}
.pt-kpi-icon-txt{font-size:16px;font-weight:900;color:#fff;}
.pt-kpi-ring-wrap{position:relative;flex-shrink:0;}
.pt-kpi-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:8.5px;font-weight:900;
}
.pt-kpi-body{position:relative;z-index:1;}
.pt-kpi-label{font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.09em;margin-bottom:4px;}
.pt-kpi-value{font-size:22px;font-weight:900;letter-spacing:-.04em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-kpi-sub{font-size:10px;color:#94a3b8;margin-top:3px;}
.pt-kpi-foot{position:relative;z-index:1;}
.pt-kpi-bar-bg{height:4px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden;margin-bottom:8px;}
.pt-kpi-bar-fill{height:100%;border-radius:99px;transition:width 1.3s cubic-bezier(.34,1.56,.64,1);}

/* ── 2-col main layout ────────────────────────────────────── */
.pt-main{display:grid;grid-template-columns:1fr 360px;gap:22px;align-items:start;}
@media(max-width:1100px){.pt-main{grid-template-columns:1fr;}}

.pt-section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.pt-section-title{font-size:14.5px;font-weight:900;color:#0f172a;letter-spacing:-.025em;}
.pt-badge-pill{
  font-size:10px;font-weight:800;
  background:rgba(124,58,237,0.07);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.18);
  padding:4px 12px;border-radius:100px;
}

/* ── Staff performance cards ──────────────────────────────── */
.pt-cards{display:flex;flex-direction:column;gap:16px;}
.pt-card{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.90);
  backdrop-filter:blur(22px) saturate(1.3);
  border:1.5px solid rgba(255,255,255,0.99);
  border-radius:26px;padding:26px;
  box-shadow:0 6px 28px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.9);
  display:flex;flex-direction:column;gap:16px;
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  animation:pt-card-in .45s ease both;
}
.pt-card:hover{transform:translateY(-4px);box-shadow:0 18px 50px rgba(0,0,0,0.09);}
.pt-card-glow{position:absolute;inset:0;pointer-events:none;}

.pt-card-top{display:flex;align-items:flex-start;gap:14px;position:relative;z-index:1;}
.pt-avatar{
  position:relative;width:58px;height:58px;border-radius:18px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:19px;font-weight:900;
  box-shadow:0 5px 18px rgba(0,0,0,0.18);
}
.pt-crown{position:absolute;top:-10px;right:-5px;font-size:15px;line-height:1;}
.pt-card-info{flex:1;min-width:0;}
.pt-card-name{font-size:16px;font-weight:900;color:#0f172a;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-card-role{font-size:11px;color:#94a3b8;margin-top:2px;text-transform:capitalize;}
.pt-perf-badge{
  display:inline-flex;align-items:center;gap:4px;margin-top:7px;
  padding:4px 11px;border-radius:100px;font-size:11px;font-weight:800;
}
.pt-ring-wrap{position:relative;flex-shrink:0;}
.pt-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:12px;font-weight:900;
}

.pt-metrics{display:flex;flex-direction:column;gap:11px;position:relative;z-index:1;}
.pt-metric-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.pt-metric-lbl{font-size:11.5px;font-weight:700;color:#475569;}
.pt-metric-val{font-size:12px;font-weight:800;color:#0f172a;}
.pt-metric-of{font-weight:500;color:#94a3b8;}
.pt-bar{height:6px;background:rgba(0,0,0,0.06);border-radius:99px;overflow:hidden;}
.pt-bar-fill{height:100%;border-radius:99px;transition:width 1.3s cubic-bezier(.34,1.56,.64,1);}

.pt-insight{
  display:flex;align-items:flex-start;gap:8px;
  background:linear-gradient(135deg,rgba(124,58,237,0.05),rgba(79,70,229,0.03));
  border:1px solid rgba(124,58,237,0.11);
  border-radius:14px;padding:11px 14px;
  font-size:12px;color:#4c1d95;line-height:1.58;
  position:relative;z-index:1;
}
.pt-ai-star{
  font-size:14px;flex-shrink:0;margin-top:1px;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

/* ── Right column ─────────────────────────────────────────── */
.pt-right{display:flex;flex-direction:column;gap:18px;}
.pt-glass-card{
  background:rgba(255,255,255,0.90);backdrop-filter:blur(22px);
  border:1.5px solid rgba(255,255,255,0.99);
  border-radius:24px;padding:22px;
  box-shadow:0 6px 28px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9);
}
.pt-tips-card{
  background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.03));
  border:1.5px solid rgba(124,58,237,0.13);
  border-radius:20px;padding:18px 20px;
}
.pt-tips-header{
  display:flex;align-items:center;gap:7px;
  font-size:10px;font-weight:800;color:#7c3aed;
  text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px;
}
.pt-tips-body{font-size:12.5px;color:#4c1d95;line-height:1.6;}

.pt-tabs{display:flex;gap:3px;background:#f1f5f9;border-radius:10px;padding:3px;}
.pt-tab{
  padding:5px 13px;border:none;background:none;
  border-radius:7px;font-size:12px;font-weight:700;
  color:#94a3b8;cursor:pointer;transition:all .14s;
}
.pt-tab.on{background:#fff;color:#7c3aed;box-shadow:0 1px 6px rgba(0,0,0,0.08);}

.pt-leader-list{display:flex;flex-direction:column;gap:6px;margin-top:2px;}
.pt-lrow{
  display:flex;align-items:center;gap:9px;
  padding:9px 8px;border-radius:12px;
  transition:background .14s;
}
.pt-lrow:hover{background:rgba(124,58,237,0.04);}
.pt-lrank{font-size:17px;width:26px;text-align:center;flex-shrink:0;}
.pt-lav{
  width:34px;height:34px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:11px;font-weight:900;
}
.pt-linfo{flex:1;min-width:0;}
.pt-lname{font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-lbar{height:4px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden;margin-top:5px;}
.pt-lbar-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#4f46e5);border-radius:99px;transition:width 1s ease;}
.pt-lval{font-size:11.5px;font-weight:800;color:#7c3aed;flex-shrink:0;max-width:90px;text-align:right;}

.pt-srow{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.05);font-size:12.5px;
}
.pt-srow:last-child{border-bottom:none;}
.pt-srow-lbl{color:#64748b;font-weight:500;}
.pt-srow-val{font-weight:800;font-variant-numeric:tabular-nums;}

/* ── Empty state ──────────────────────────────────────────── */
.pt-empty{
  position:relative;overflow:hidden;
  text-align:center;
  background:rgba(255,255,255,0.85);
  backdrop-filter:blur(32px);
  border:1.5px solid rgba(124,58,237,0.09);
  border-radius:32px;padding:100px 60px;
  box-shadow:0 8px 44px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9);
}
@media(max-width:600px){.pt-empty{padding:72px 28px;}}
.pt-empty-halo{
  position:absolute;width:520px;height:520px;
  top:-100px;left:50%;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(124,58,237,0.13),transparent 62%);
  pointer-events:none;
}
.pt-empty-p{
  position:absolute;border-radius:50%;
  filter:blur(22px);animation:pt-float 14s ease-in-out infinite;
}
.pt-ep1{width:80px;height:80px;top:16%;left:9%;background:rgba(124,58,237,0.20);animation-delay:0s;}
.pt-ep2{width:52px;height:52px;top:28%;right:11%;background:rgba(79,70,229,0.18);animation-delay:5s;}
.pt-ep3{width:44px;height:44px;bottom:18%;left:42%;background:rgba(99,102,241,0.15);animation-delay:10s;}
@media(prefers-reduced-motion:reduce){.pt-empty-p{animation:none;}}

.pt-empty-icon-wrap{
  position:relative;display:inline-flex;align-items:center;justify-content:center;
  width:100px;height:100px;margin-bottom:24px;
}
.pt-empty-icon-ring{
  position:absolute;inset:0;border-radius:50%;
  background:linear-gradient(135deg,rgba(124,58,237,0.16),rgba(79,70,229,0.08));
  animation:pt-ring-pulse 3s ease-in-out infinite;
}
@keyframes pt-ring-pulse{
  0%,100%{transform:scale(1);opacity:1;}
  50%{transform:scale(1.08);opacity:.7;}
}
@media(prefers-reduced-motion:reduce){.pt-empty-icon-ring{animation:none;}}
.pt-empty-icon{font-size:52px;animation:pt-empty-bob 3.5s ease-in-out infinite;position:relative;z-index:1;}
@keyframes pt-empty-bob{
  0%,100%{transform:translateY(0) scale(1);}
  50%{transform:translateY(-10px) scale(1.05);}
}
@media(prefers-reduced-motion:reduce){.pt-empty-icon{animation:none;}}
.pt-empty-h{
  font-size:clamp(22px,3vw,30px);font-weight:900;letter-spacing:-.05em;margin-bottom:14px;
  background:linear-gradient(135deg,#0f172a,#7c3aed);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-empty-sub{font-size:14px;color:#64748b;max-width:460px;margin:0 auto;line-height:1.70;}
.pt-empty-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:24px;}
.pt-echip{
  background:rgba(124,58,237,0.07);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.16);
  border-radius:100px;padding:6px 16px;
  font-size:12.5px;font-weight:700;
}

/* ── Modal backdrop ───────────────────────────────────────── */
.pt-backdrop{
  position:fixed;inset:0;z-index:50;
  background:rgba(6,6,14,0.66);backdrop-filter:blur(16px);
  animation:pt-fade .20s ease;
}
@keyframes pt-fade{from{opacity:0;}to{opacity:1;}}

/* ── Modal panel ──────────────────────────────────────────── */
.pt-modal{
  position:fixed;top:50%;left:50%;z-index:60;
  transform:translate(-50%,-50%);
  width:min(660px,calc(100vw - 24px));
  max-height:92vh;overflow-y:auto;
  background:rgba(255,255,255,0.97);
  backdrop-filter:blur(56px) saturate(1.9);
  border:1.5px solid rgba(255,255,255,0.96);
  border-radius:32px;
  box-shadow:0 40px 110px rgba(6,6,14,0.30),0 0 0 1.5px rgba(124,58,237,0.11),inset 0 1px 0 #fff;
  animation:pt-modal-in .32s cubic-bezier(.34,1.56,.64,1);
  overflow:hidden;
}
@keyframes pt-modal-in{
  from{opacity:0;transform:translate(-50%,-46%) scale(0.94);}
  to  {opacity:1;transform:translate(-50%,-50%) scale(1);}
}
.pt-modal::-webkit-scrollbar{width:5px;}
.pt-modal::-webkit-scrollbar-track{background:transparent;}
.pt-modal::-webkit-scrollbar-thumb{background:rgba(124,58,237,.22);border-radius:99px;}

.pt-mo{position:absolute;border-radius:50%;pointer-events:none;filter:blur(64px);}
.pt-mo1{width:380px;height:380px;top:-90px;right:-70px;background:radial-gradient(circle,rgba(124,58,237,0.18),transparent);opacity:.65;}
.pt-mo2{width:240px;height:240px;bottom:-60px;left:-40px;background:radial-gradient(circle,rgba(79,70,229,0.16),transparent);opacity:.55;}

.pt-modal-hd{
  display:flex;align-items:flex-start;gap:16px;
  padding:30px 32px 24px;
  border-bottom:1px solid rgba(0,0,0,0.055);
  position:relative;z-index:1;
}
.pt-modal-hd-icon{
  width:50px;height:50px;border-radius:16px;flex-shrink:0;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 22px rgba(124,58,237,0.33);
}
.pt-modal-title{font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-.03em;margin-bottom:4px;}
.pt-modal-sub{font-size:12.5px;color:#64748b;line-height:1.5;}
.pt-modal-x{
  margin-left:auto;flex-shrink:0;
  width:34px;height:34px;border-radius:10px;
  background:#f8fafc;border:1.5px solid #e2e8f0;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#64748b;transition:all .14s;
}
.pt-modal-x:hover{background:#fee2e2;border-color:#fecdd3;color:#e11d48;}

.pt-modal-body{
  padding:26px 32px 30px;
  display:flex;flex-direction:column;gap:20px;
  position:relative;z-index:1;
}

/* ── Form fields ──────────────────────────────────────────── */
.pt-field{display:flex;flex-direction:column;gap:8px;}
.pt-flabel{
  display:flex;align-items:center;gap:5px;
  font-size:11px;font-weight:800;color:#334155;
  text-transform:uppercase;letter-spacing:.08em;
}
.pt-req{color:#e11d48;font-size:14px;line-height:1;}
.pt-opt{font-size:10px;color:#94a3b8;font-weight:600;text-transform:none;letter-spacing:0;}

.pt-field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:520px){.pt-field-row{grid-template-columns:1fr;}}

.pt-select-wrap{position:relative;}
.pt-select{
  width:100%;appearance:none;
  background:rgba(248,250,252,0.96);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:14px 44px 14px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;cursor:pointer;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.pt-select:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.10);background:#fff;}
.pt-sel-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;}

.pt-inp-wrap{position:relative;}
.pt-inp-pre{
  position:absolute;left:15px;top:50%;transform:translateY(-50%);
  font-size:15px;pointer-events:none;z-index:1;color:#94a3b8;font-weight:700;
}
.pt-input{
  width:100%;
  background:rgba(248,250,252,0.96);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:14px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.pt-input-pre{padding-left:42px;}
.pt-input:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.10);background:#fff;}
.pt-input::placeholder{color:#cbd5e1;font-weight:400;}

/* ── AI prediction panel ──────────────────────────────────── */
.pt-ai-panel{
  background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.03));
  border:1.5px solid rgba(124,58,237,0.15);
  border-radius:20px;padding:18px 20px;
  animation:pt-slide .22s ease;
}
.pt-ai-panel-header{
  display:flex;align-items:center;gap:7px;
  font-size:10px;font-weight:800;color:#7c3aed;
  text-transform:uppercase;letter-spacing:.09em;
  margin-bottom:14px;
}
.pt-ai-name{font-weight:700;color:#4f46e5;text-transform:none;letter-spacing:0;font-size:11px;}

.pt-ai-preview{display:flex;flex-direction:column;gap:12px;}
.pt-ai-prob{display:flex;align-items:center;gap:14px;}
.pt-ai-prob-ring{position:relative;flex-shrink:0;}
.pt-ai-prob-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:12px;font-weight:900;color:#7c3aed;
}
.pt-ai-prob-label{font-size:13.5px;font-weight:800;color:#0f172a;margin-bottom:3px;}
.pt-ai-prob-sub{font-size:11.5px;color:#64748b;}

.pt-ai-meter-row{display:flex;align-items:center;gap:11px;}
.pt-ai-bar-bg{flex:1;height:8px;background:rgba(124,58,237,0.12);border-radius:99px;overflow:hidden;}
.pt-ai-bar-fill{
  height:100%;border-radius:99px;
  background:linear-gradient(90deg,#7c3aed,#4f46e5,#6366f1);
  transition:width .7s cubic-bezier(.34,1.56,.64,1);
}

.pt-ai-txt{font-size:12.5px;color:#4c1d95;line-height:1.60;}
.pt-ai-chips{display:flex;flex-wrap:wrap;gap:7px;}
.pt-ai-chip{
  background:rgba(124,58,237,0.08);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.16);
  border-radius:100px;padding:5px 12px;
  font-size:11.5px;font-weight:700;
}

/* ── Submit ───────────────────────────────────────────────── */
.pt-submit{
  position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:16px;border:none;border-radius:18px;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#6366f1 100%);
  color:#fff;font-size:15px;font-weight:800;
  cursor:pointer;letter-spacing:-.01em;
  box-shadow:0 8px 30px rgba(124,58,237,0.38),0 2px 8px rgba(0,0,0,0.06);
  transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s;
}
.pt-submit:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 16px 46px rgba(124,58,237,0.48);}
.pt-submit:active:not(:disabled){transform:translateY(-1px);}
.pt-submit:disabled{opacity:.55;cursor:not-allowed;transform:none;}
.pt-submit.busy{animation:pt-busy .9s ease-in-out infinite;}
@keyframes pt-busy{0%,100%{opacity:1;}50%{opacity:.65;}}
.pt-submit-glow{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.18),transparent 55%);
  pointer-events:none;
}
.pt-spin{
  display:inline-block;width:15px;height:15px;border-radius:50%;
  border:2.5px solid rgba(255,255,255,0.35);border-top-color:#fff;
  animation:pt-rot .7s linear infinite;
}
@keyframes pt-rot{to{transform:rotate(360deg);}}

/* ── Skeleton ─────────────────────────────────────────────── */
.sk{
  background:linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%);
  background-size:200% 100%;
  animation:pt-shimmer 1.6s ease-in-out infinite;
}
@keyframes pt-shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
@media(prefers-reduced-motion:reduce){.sk{animation:none;background:#f1f5f9;}}
`;
