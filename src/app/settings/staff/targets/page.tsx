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
  if (p >= 100) return { label: 'Goal Crushed',  color: '#065f46', bg: 'rgba(16,185,129,0.12)',  ring: '#10b981', glow: 'rgba(16,185,129,0.28)',  icon: '🏆' };
  if (p >= 85)  return { label: 'Elite Pace',    color: '#78350f', bg: 'rgba(245,158,11,0.10)',  ring: '#f59e0b', glow: 'rgba(245,158,11,0.24)',  icon: '🔥' };
  if (p >= 70)  return { label: 'On Track',      color: '#1e40af', bg: 'rgba(59,130,246,0.10)',  ring: '#3b82f6', glow: 'rgba(59,130,246,0.22)',  icon: '📈' };
  if (p >= 50)  return { label: 'In Progress',   color: '#5b21b6', bg: 'rgba(124,58,237,0.09)', ring: '#7c3aed', glow: 'rgba(124,58,237,0.20)', icon: '⚡' };
  return               { label: 'Just Started',  color: '#475569', bg: 'rgba(100,116,139,0.08)',ring: '#94a3b8', glow: 'rgba(100,116,139,0.14)', icon: '🎯' };
};

const aiInsight = (p: number, name: string) => {
  const n = name.split(' ')[0] || 'This member';
  if (p >= 100) return `${n} crushed the target. Consider raising next month's goal by 15–20% to build elite momentum.`;
  if (p >= 85)  return `${100 - p}% remaining — ${n} is on track to close by month end with current velocity.`;
  if (p >= 70)  return `Solid momentum. A focused push this week can close ${n}'s remaining gap efficiently.`;
  if (p >= 50)  return `Midway there. Review ${n}'s lead conversion rate to accelerate closure before month end.`;
  return `Early stage. Set ${n} daily micro-targets and weekly check-ins to build consistent momentum fast.`;
};

/* ─── SVG Progress Ring ───────────────────────────────────────────── */
function Ring({ value, size = 64, stroke = 6, color = '#7c3aed', glow }: {
  value: number; size?: number; stroke?: number; color?: string; glow?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      {glow && (
        <defs>
          <filter id={`glow-${size}-${color.replace('#','')}`}>
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      )}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.065)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        filter={glow ? `url(#glow-${size}-${color.replace('#','')})` : undefined}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}/>
    </svg>
  );
}

/* ─── Sparkline ────────────────────────────────────────────────────── */
function Sparkline({ value, color }: { value: number; color: string }) {
  const raw = [28, 42, 35, 54, 40, 58, 50, value];
  const max = Math.max(...raw, 10);
  const pts = raw.map((v, i) => `${i * 14},${62 - Math.round((v / max) * 55)}`).join(' ');
  return (
    <svg width="98" height="26" viewBox="0 0 98 62" preserveAspectRatio="none" style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.65"/>
    </svg>
  );
}

/* ─── Month Options ───────────────────────────────────────────────── */
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
  const [submitDone, setSubmitDone] = useState(false);
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
    setSubmitDone(false);
    setModal(true);
  };

  const submitTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staff_id) return setError('Please select a staff member');
    setSubmitting(true); setError('');
    try {
      await api.staff.targets.create({
        staff_id: form.staff_id, month,
        target_revenue:  Number(form.target_revenue)  || 0,
        target_clients:  Number(form.target_clients)  || 0,
        target_sessions: Number(form.target_sessions) || 0,
        achieved_revenue: 0, achieved_clients: 0, achieved_sessions: 0,
      });
      setSubmitDone(true);
      setTimeout(() => {
        flash('Target set successfully!');
        setModal(false);
        loadTargets();
      }, 900);
    } catch (ex: unknown) {
      setError((ex instanceof Error ? ex.message : null) || 'Could not save target');
    } finally { setSubmitting(false); }
  };

  /* ── KPI computations ────────────────────────────────────────────── */
  const totalRevTarget   = targets.reduce((a, t) => a + (t.target_revenue   ?? 0), 0);
  const totalRevAchieved = targets.reduce((a, t) => a + (t.achieved_revenue ?? 0), 0);
  const totalCliTarget   = targets.reduce((a, t) => a + (t.target_clients   ?? 0), 0);
  const totalCliAchieved = targets.reduce((a, t) => a + (t.achieved_clients ?? 0), 0);
  const overallPct       = pct(totalRevAchieved, totalRevTarget);
  const achieved100      = targets.filter(t => pct(t.achieved_revenue ?? 0, t.target_revenue ?? 0) >= 100).length;
  const teamScore        = Math.round(overallPct * 0.6 + pct(totalCliAchieved, totalCliTarget) * 0.4);

  const sorted        = [...targets].sort((a, b) =>
    leaderSort === 'revenue'
      ? (b.achieved_revenue ?? 0) - (a.achieved_revenue ?? 0)
      : (b.achieved_clients ?? 0) - (a.achieved_clients ?? 0));
  const bestPerformer = sorted[0];

  /* AI probability */
  const aiProb = form.target_revenue
    ? Math.max(38, Math.min(96, 60 + (Number(form.target_revenue) % 37)))
    : 0;
  const selectedStaff = staff.find(s => s.id === form.staff_id);

  const kpis = [
    {
      label: 'Revenue Target',  value: loading ? '—' : fmt(totalRevTarget),
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
      label: 'Active Targets',  value: loading ? '—' : String(targets.length),
      sub: `${achieved100} fully achieved`, icon: '◎',
      grad: ['#0ea5e9','#2563eb'] as [string,string],
      pctVal: targets.length > 0 ? Math.round((achieved100 / targets.length) * 100) : 0,
      sparkVal: targets.length * 12,
    },
    {
      label: 'Client Targets',  value: loading ? '—' : String(totalCliTarget),
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
        <div className="pt-noise"/>
      </div>

      <div className="pt-page">

        {/* ── HERO HEADER ─────────────────────────────────────────── */}
        <header className="pt-hero">
          <div className="pt-hero-glow" aria-hidden="true"/>
          <div className="pt-hero-left">
            <div className="pt-eyebrow">
              <span className="pt-live-dot" aria-label="Live"/>
              619 Fitness · Performance Command Center
            </div>
            <h1 className="pt-hero-title">Staff Targets</h1>
            <p className="pt-hero-sub">
              Set, track and optimise monthly performance goals — powered by intelligent analytics and real-time team insights.
            </p>
          </div>
          <div className="pt-hero-right">
            <div className="pt-month-pill">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <select value={month} onChange={e => setMonth(e.target.value)} className="pt-month-select" aria-label="Select month">
                <MonthOptions/>
              </select>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <button className="pt-cta-btn" onClick={openModal} aria-label="Set new target">
              <span className="pt-cta-icon" aria-hidden="true">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
              </span>
              Set Target
              <span className="pt-cta-shimmer" aria-hidden="true"/>
            </button>
          </div>
        </header>

        {/* ── ALERTS ───────────────────────────────────────────────── */}
        {error   && <div className="pt-alert pt-alert-err" role="alert"><span>⚠</span>{error}<button onClick={() => setError('')} aria-label="Dismiss">✕</button></div>}
        {success && <div className="pt-alert pt-alert-ok"  role="status"><span>✓</span>{success}</div>}

        {/* ── KPI GRID ─────────────────────────────────────────────── */}
        <div className="pt-kpis" role="list">
          {kpis.map((k, i) => (
            <div key={k.label} className="pt-kpi" role="listitem" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="pt-kpi-mesh" style={{
                background: `radial-gradient(circle at 15% 15%,${k.grad[0]}30,transparent 52%),radial-gradient(circle at 85% 85%,${k.grad[1]}1a,transparent 44%)`
              }}/>
              <div className="pt-kpi-top">
                <div className="pt-kpi-icon-box" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})` }}>
                  <span className="pt-kpi-icon-txt">{k.icon}</span>
                  <div className="pt-kpi-icon-glow" style={{ background: k.grad[0] }}/>
                </div>
                <div className="pt-kpi-ring-wrap" aria-hidden="true">
                  <Ring value={k.pctVal} size={54} stroke={5} color={k.grad[0]} glow={k.grad[0]}/>
                  <span className="pt-kpi-ring-pct" style={{ color: k.grad[0] }}>{k.pctVal}%</span>
                </div>
              </div>
              <div className="pt-kpi-body">
                <p className="pt-kpi-label">{k.label}</p>
                <p className="pt-kpi-value" style={{
                  background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                }}>
                  {k.value}
                </p>
                <p className="pt-kpi-sub">{k.sub}</p>
              </div>
              <div className="pt-kpi-foot">
                <div className="pt-kpi-bar-bg">
                  <div className="pt-kpi-bar-fill" style={{
                    width: `${k.pctVal}%`,
                    background: `linear-gradient(90deg,${k.grad[0]},${k.grad[1]})`
                  }}/>
                </div>
                <Sparkline value={k.sparkVal} color={k.grad[0]}/>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
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
                  const rp      = pct(t.achieved_revenue ?? 0, t.target_revenue ?? 0);
                  const cp      = pct(t.achieved_clients ?? 0, t.target_clients ?? 0);
                  const badge   = perfBadge(rp);
                  const insight = aiInsight(rp, t.staff_name || 'Staff');
                  return (
                    <article key={t.id} className="pt-card" style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="pt-card-glow" style={{
                        background: `radial-gradient(circle at 88% 12%,${badge.glow},transparent 52%)`
                      }}/>
                      <div className="pt-card-grid-top">
                        {/* Avatar */}
                        <div className="pt-avatar" style={{ background: avatarGrad(t.staff_name || '') }}
                          aria-label={`Avatar for ${t.staff_name}`}>
                          {initials(t.staff_name || '?')}
                          {i === 0 && <span className="pt-crown" aria-label="Top performer">👑</span>}
                        </div>

                        {/* Info */}
                        <div className="pt-card-info">
                          <div className="pt-card-name">{t.staff_name || 'Staff'}</div>
                          <div className="pt-card-role">{t.role || 'Team Member'}</div>
                          <span className="pt-perf-badge" style={{ background: badge.bg, color: badge.color }}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>

                        {/* Ring */}
                        <div className="pt-ring-wrap" aria-label={`${rp}% achievement`}>
                          <Ring value={rp} size={76} stroke={7} color={badge.ring} glow={badge.glow}/>
                          <span className="pt-ring-pct" style={{ color: badge.ring }}>{rp}%</span>
                        </div>
                      </div>

                      {/* Quick stats row */}
                      <div className="pt-stat-row">
                        {[
                          { label: 'Revenue',  val: fmt(t.achieved_revenue ?? 0),   tgt: fmt(t.target_revenue ?? 0) },
                          { label: 'Clients',  val: String(t.achieved_clients ?? 0), tgt: String(t.target_clients ?? 0) },
                          { label: 'Sessions', val: String(t.achieved_sessions ?? 0),tgt: String(t.target_sessions ?? 0) },
                        ].map(s => (
                          <div key={s.label} className="pt-stat-cell">
                            <span className="pt-stat-label">{s.label}</span>
                            <span className="pt-stat-val">{s.val}</span>
                            <span className="pt-stat-tgt">of {s.tgt}</span>
                          </div>
                        ))}
                      </div>

                      {/* Progress bars */}
                      <div className="pt-metrics">
                        {[
                          { label: 'Revenue',  p: rp,  color: badge.ring,  ach: fmt(t.achieved_revenue ?? 0),   tgt: fmt(t.target_revenue ?? 0) },
                          { label: 'Clients',  p: cp,  color: '#06b6d4',   ach: String(t.achieved_clients ?? 0), tgt: String(t.target_clients ?? 0) },
                        ].map(m => (
                          <div key={m.label} className="pt-metric">
                            <div className="pt-metric-head">
                              <span className="pt-metric-lbl">{m.label}</span>
                              <span className="pt-metric-val">{m.ach} <span className="pt-metric-of">/ {m.tgt}</span></span>
                            </div>
                            <div className="pt-bar" role="progressbar" aria-valuenow={m.p} aria-valuemin={0} aria-valuemax={100}>
                              <div className="pt-bar-fill" style={{ width:`${m.p}%`, background:`linear-gradient(90deg,${m.color},${m.color}bb)` }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI insight */}
                      <div className="pt-insight" role="note">
                        <span className="pt-ai-star" aria-hidden="true">✦</span>
                        <span>{insight}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — leaderboard + analytics */}
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
                          <div className="pt-lbar" role="progressbar" aria-valuenow={p2} aria-valuemin={0} aria-valuemax={100}>
                            <div className="pt-lbar-fill" style={{ width:`${p2}%` }}/>
                          </div>
                        </div>
                        <div className="pt-lval">{val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month Summary */}
              <div className="pt-glass-card">
                <h2 className="pt-section-title" style={{ marginBottom: 18 }}>Month Summary</h2>
                {[
                  { label: 'Revenue Progress',  val: `${overallPct}%`,                             color: '#7c3aed' },
                  { label: 'Client Progress',   val: `${pct(totalCliAchieved,totalCliTarget)}%`,   color: '#06b6d4' },
                  { label: 'Targets Completed', val: `${achieved100} / ${targets.length}`,          color: '#10b981' },
                  { label: 'Total Achieved',    val: fmt(totalRevAchieved),                         color: '#f59e0b' },
                  { label: 'Team Score',        val: String(teamScore),                             color: '#8b5cf6' },
                ].map(r => (
                  <div key={r.label} className="pt-srow">
                    <span className="pt-srow-lbl">{r.label}</span>
                    <span className="pt-srow-val" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Coaching Insight */}
              <div className="pt-tips-card">
                <div className="pt-tips-header">
                  <span className="pt-ai-star">✦</span>
                  AI Coaching Insight
                </div>
                <p className="pt-tips-body">
                  {overallPct >= 80
                    ? `Team is ${overallPct}% toward monthly revenue goal — exceptional! Consider raising stretch targets by 15% to push elite momentum further.`
                    : overallPct >= 50
                    ? `At ${overallPct}% of the revenue goal. Focus energy on your top 2 performers — their acceleration raises the entire team average.`
                    : `Early in the month. Lock in client conversion follow-ups within 48 hours to keep the pipeline warm and velocity high.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SET TARGET MODAL ════════════════════════════════════════ */}
      {modal && (
        <>
          <div className="pt-backdrop" onClick={() => setModal(false)} aria-hidden="true"/>
          <div className="pt-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

            {/* ambient orbs */}
            <div className="pt-mo pt-mo1" aria-hidden="true"/>
            <div className="pt-mo pt-mo2" aria-hidden="true"/>
            <div className="pt-mo pt-mo3" aria-hidden="true"/>

            {/* ── MODAL HEADER ─── */}
            <div className="pt-modal-hd">
              <div className="pt-modal-hd-icon" aria-hidden="true">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <div className="pt-modal-icon-glow"/>
              </div>
              <div style={{ flex: 1 }}>
                <h2 id="modal-title" className="pt-modal-title">Set Monthly Performance Targets</h2>
                <p className="pt-modal-sub">
                  Define ambitious, data-driven goals ·{' '}
                  <strong style={{ color:'#7c3aed' }}>{monthLabel(month)}</strong>
                </p>
              </div>
              <button className="pt-modal-x" onClick={() => setModal(false)} aria-label="Close modal">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && (
              <div className="pt-alert pt-alert-err" style={{ margin:'0 28px 8px' }} role="alert">
                <span>⚠</span>{error}
              </div>
            )}

            <form onSubmit={submitTarget} className="pt-modal-body" noValidate>

              {/* Two-column layout: form fields left, preview right */}
              <div className="pt-modal-cols">

                {/* LEFT: form fields */}
                <div className="pt-modal-form-col">

                  {/* Staff selector */}
                  <div className="pt-field">
                    <label className="pt-flabel" htmlFor="modal-staff">
                      Staff Member <span className="pt-req" aria-hidden="true">*</span>
                    </label>
                    <div className="pt-select-wrap">
                      <span className="pt-inp-pre" aria-hidden="true" style={{ fontSize:'13px' }}>◎</span>
                      <select id="modal-staff" className="pt-select pt-select-ico"
                        value={form.staff_id}
                        onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}
                        required>
                        <option value="" disabled>Choose a team member…</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>)}
                      </select>
                      <svg className="pt-sel-arrow" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
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

                  {/* Suggested targets hint */}
                  <div className="pt-suggest-row">
                    <span className="pt-suggest-label">Quick fill:</span>
                    {[50000, 100000, 150000].map(v => (
                      <button key={v} type="button" className="pt-suggest-chip"
                        onClick={() => setForm(p => ({ ...p, target_revenue: String(v) }))}>
                        {fmt(v)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT: live preview */}
                <div className="pt-modal-preview-col">
                  {(form.target_revenue || form.target_clients) ? (
                    <div className="pt-ai-panel" role="complementary" aria-label="AI prediction">
                      <div className="pt-ai-panel-header">
                        <span className="pt-ai-star">✦</span>
                        AI Prediction
                        {selectedStaff && <span className="pt-ai-name">· {selectedStaff.name.split(' ')[0]}</span>}
                      </div>

                      {/* Ring + label */}
                      <div className="pt-ai-prob">
                        <div className="pt-ai-prob-ring" aria-hidden="true">
                          <Ring value={aiProb} size={72} stroke={7} color="#7c3aed" glow="#7c3aed"/>
                          <span className="pt-ai-prob-pct">{aiProb}%</span>
                        </div>
                        <div>
                          <p className="pt-ai-prob-label">Success probability</p>
                          <p className="pt-ai-prob-sub">Based on last 90-day data</p>
                        </div>
                      </div>

                      {/* Meter */}
                      <div className="pt-ai-meter-row">
                        <div className="pt-ai-bar-bg">
                          <div className="pt-ai-bar-fill" style={{ width:`${aiProb}%` }}/>
                        </div>
                      </div>

                      <p className="pt-ai-txt">
                        This target has an estimated{' '}
                        <strong style={{ color:'#7c3aed' }}>{aiProb}% success probability</strong>.
                        {Number(form.target_revenue) > 200000 && ' Consider a stretch incentive to drive full achievement.'}
                        {Number(form.target_revenue) > 0 && Number(form.target_revenue) <= 80000 && ' Conservative — consider raising 20% for higher motivation.'}
                      </p>

                      {/* Breakdown chips */}
                      {form.target_revenue && (
                        <div className="pt-ai-chips">
                          <span className="pt-ai-chip">
                            Stretch: {fmt(Math.round(Number(form.target_revenue) * 1.15))}
                          </span>
                          <span className="pt-ai-chip">
                            Daily: {fmt(Math.round(Number(form.target_revenue) / 26))}
                          </span>
                          <span className="pt-ai-chip">
                            Weekly: {fmt(Math.round(Number(form.target_revenue) / 4))}
                          </span>
                        </div>
                      )}

                      {/* Preview card */}
                      {selectedStaff && (
                        <div className="pt-preview-card">
                          <div className="pt-preview-av" style={{ background: avatarGrad(selectedStaff.name) }}>
                            {initials(selectedStaff.name)}
                          </div>
                          <div className="pt-preview-info">
                            <div className="pt-preview-name">{selectedStaff.name}</div>
                            <div className="pt-preview-role">{selectedStaff.role || 'Team Member'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-preview-empty">
                      <div className="pt-preview-empty-icon" aria-hidden="true">✦</div>
                      <p className="pt-preview-empty-txt">
                        Fill in revenue or client targets to see AI performance predictions.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                type="submit"
                className={`pt-submit${submitting ? ' busy' : ''}${submitDone ? ' done' : ''}`}
                disabled={submitting || submitDone}
                aria-label="Set performance target">
                {submitDone ? (
                  <>
                    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                    Target Set!
                  </>
                ) : submitting ? (
                  <><span className="pt-spin" aria-hidden="true"/>Setting target…</>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
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
            <div className="sk" style={{ width:58, height:58, borderRadius:18 }}/>
            <div style={{ flex:1 }}>
              <div className="sk" style={{ height:14, width:'45%', borderRadius:8, marginBottom:10 }}/>
              <div className="sk" style={{ height:10, width:'28%', borderRadius:8 }}/>
            </div>
            <div className="sk" style={{ width:76, height:76, borderRadius:'50%', flexShrink:0 }}/>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {[1,2,3].map(j => <div key={j} className="sk" style={{ flex:1, height:48, borderRadius:12 }}/>)}
          </div>
          <div className="sk" style={{ height:7, borderRadius:99 }}/>
          <div className="sk" style={{ height:7, width:'72%', borderRadius:99 }}/>
          <div className="sk" style={{ height:40, borderRadius:14 }}/>
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
        <div className="pt-empty-icon-ring pt-empty-icon-ring2"/>
        <span className="pt-empty-icon">🎯</span>
      </div>

      <h2 className="pt-empty-h">No Targets Set for {monthLabel(currentMonth())}</h2>
      <p className="pt-empty-sub">
        Define monthly performance goals for your coaching team and unlock a real-time intelligence cockpit — revenue, clients, sessions, AI insights, and team leaderboards, all automated.
      </p>
      <div className="pt-empty-chips">
        {['Revenue tracking','Client analytics','Session metrics','Team leaderboard','AI insights','Performance badges'].map(f => (
          <span key={f} className="pt-echip">{f}</span>
        ))}
      </div>
      <button className="pt-cta-btn" onClick={onSet} style={{ marginTop: 40 }} aria-label="Set first target">
        <span className="pt-cta-icon" aria-hidden="true">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        Set First Monthly Target
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
.pt-blob{position:absolute;border-radius:50%;filter:blur(100px);opacity:.18;animation:pt-float 20s ease-in-out infinite;}
.pt-b1{width:720px;height:720px;top:-180px;right:-120px;background:radial-gradient(circle,rgba(124,58,237,0.5),rgba(79,70,229,0.3));animation-delay:0s;}
.pt-b2{width:520px;height:520px;bottom:-80px;left:-100px;background:radial-gradient(circle,rgba(6,182,212,0.4),rgba(14,165,233,0.2));animation-delay:8s;}
.pt-b3{width:360px;height:360px;top:44%;left:40%;background:radial-gradient(circle,rgba(16,185,129,0.22),rgba(245,158,11,0.12));animation-delay:15s;}
.pt-noise{position:absolute;inset:0;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat;}
@keyframes pt-float{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(22px,-26px) scale(1.04);}66%{transform:translate(-16px,18px) scale(0.96);}}
@media(prefers-reduced-motion:reduce){.pt-blob{animation:none;}}

/* ── Page container ───────────────────────────────────────── */
.pt-page{
  position:relative;z-index:1;
  max-width:1520px;margin:0 auto;
  padding:40px 40px 120px;
  min-height:100vh;
}
@media(max-width:768px){.pt-page{padding:20px 16px 100px;}}

/* ── Hero ─────────────────────────────────────────────────── */
.pt-hero{
  position:relative;overflow:hidden;
  display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;
  gap:24px;margin-bottom:28px;
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(40px) saturate(1.7);
  border:1.5px solid rgba(255,255,255,0.96);
  border-radius:30px;padding:38px 44px;
  box-shadow:
    0 2px 0 rgba(255,255,255,0.9) inset,
    0 8px 48px rgba(124,58,237,0.09),
    0 2px 8px rgba(0,0,0,0.04);
}
@media(max-width:680px){.pt-hero{flex-direction:column;align-items:flex-start;padding:24px 22px;}}
.pt-hero-glow{
  position:absolute;top:-60px;right:-60px;
  width:360px;height:360px;border-radius:50%;
  background:radial-gradient(circle,rgba(124,58,237,0.14),transparent 62%);
  pointer-events:none;
}

.pt-eyebrow{
  display:inline-flex;align-items:center;gap:9px;
  font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;
  color:#7c3aed;background:rgba(124,58,237,0.07);
  border:1px solid rgba(124,58,237,0.20);border-radius:100px;
  padding:5px 14px;margin-bottom:14px;
}
.pt-live-dot{
  width:7px;height:7px;border-radius:50%;background:#10b981;flex-shrink:0;
  box-shadow:0 0 0 0 rgba(16,185,129,0.55);
  animation:pt-pulse 2.2s ease-in-out infinite;
}
@keyframes pt-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.55);}60%{box-shadow:0 0 0 7px transparent;}}
@media(prefers-reduced-motion:reduce){.pt-live-dot{animation:none;}}

.pt-hero-title{
  font-size:clamp(26px,3.2vw,44px);font-weight:900;
  letter-spacing:-.055em;line-height:1.06;
  background:linear-gradient(135deg,#0f172a 0%,#4f46e5 45%,#7c3aed 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-hero-sub{font-size:13.5px;color:#64748b;margin-top:10px;max-width:520px;line-height:1.68;}
.pt-hero-right{display:flex;align-items:center;gap:12px;flex-shrink:0;flex-wrap:wrap;}

/* ── Month pill ───────────────────────────────────────────── */
.pt-month-pill{
  display:flex;align-items:center;gap:8px;
  background:rgba(255,255,255,0.96);backdrop-filter:blur(18px);
  border:1.5px solid rgba(124,58,237,0.18);border-radius:100px;
  padding:11px 18px;
  box-shadow:0 2px 18px rgba(124,58,237,0.10),inset 0 1px 0 #fff;
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
  display:inline-flex;align-items:center;gap:10px;
  padding:13px 28px;border-radius:100px;border:none;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#6366f1 100%);
  color:#fff;font-size:14px;font-weight:800;
  cursor:pointer;white-space:nowrap;
  box-shadow:0 6px 28px rgba(124,58,237,0.42),0 1px 4px rgba(0,0,0,0.06);
  transition:transform .26s cubic-bezier(.34,1.56,.64,1),box-shadow .26s;
}
.pt-cta-btn:hover{transform:translateY(-4px) scale(1.025);box-shadow:0 16px 48px rgba(124,58,237,0.52);}
.pt-cta-btn:active{transform:translateY(-1px);}
.pt-cta-icon{
  display:flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,0.22);flex-shrink:0;
}
.pt-cta-shimmer{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.24) 0%,transparent 52%);
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
  grid-template-columns:repeat(auto-fill,minmax(212px,1fr));
  gap:14px;margin-bottom:28px;
}
@media(max-width:640px){.pt-kpis{grid-template-columns:1fr 1fr;gap:11px;}}
@media(max-width:400px){.pt-kpis{grid-template-columns:1fr;}}

.pt-kpi{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.86);
  backdrop-filter:blur(28px) saturate(1.5);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:24px;padding:20px;
  display:flex;flex-direction:column;gap:13px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 4px 24px rgba(0,0,0,0.055),
    0 1px 3px rgba(0,0,0,0.03);
  transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s;
  animation:pt-card-in .44s ease both;
}
.pt-kpi:hover{transform:translateY(-6px) scale(1.01);box-shadow:0 22px 54px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,.95);}
@keyframes pt-card-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:none;}}
@media(prefers-reduced-motion:reduce){.pt-kpi,.pt-card{animation:none;}}

.pt-kpi-mesh{position:absolute;inset:0;pointer-events:none;}
.pt-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1;}
.pt-kpi-icon-box{
  position:relative;overflow:hidden;
  width:44px;height:44px;border-radius:14px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,0.20);
}
.pt-kpi-icon-glow{
  position:absolute;bottom:-8px;left:-8px;
  width:40px;height:40px;border-radius:50%;opacity:.55;filter:blur(12px);
}
.pt-kpi-icon-txt{font-size:17px;font-weight:900;color:#fff;position:relative;z-index:1;}
.pt-kpi-ring-wrap{position:relative;flex-shrink:0;}
.pt-kpi-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:8.5px;font-weight:900;
}
.pt-kpi-body{position:relative;z-index:1;}
.pt-kpi-label{font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.09em;margin-bottom:4px;}
.pt-kpi-value{font-size:22px;font-weight:900;letter-spacing:-.045em;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-kpi-sub{font-size:10px;color:#94a3b8;margin-top:3px;}
.pt-kpi-foot{position:relative;z-index:1;}
.pt-kpi-bar-bg{height:4px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden;margin-bottom:8px;}
.pt-kpi-bar-fill{height:100%;border-radius:99px;transition:width 1.4s cubic-bezier(.34,1.56,.64,1);}

/* ── 2-col main layout ────────────────────────────────────── */
.pt-main{display:grid;grid-template-columns:1fr 368px;gap:22px;align-items:start;}
@media(max-width:1120px){.pt-main{grid-template-columns:1fr;}}

.pt-section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.pt-section-title{font-size:14.5px;font-weight:900;color:#0f172a;letter-spacing:-.028em;}
.pt-badge-pill{
  font-size:10px;font-weight:800;
  background:rgba(124,58,237,0.08);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.20);
  padding:4px 13px;border-radius:100px;
}

/* ── Staff cards ──────────────────────────────────────────── */
.pt-cards{display:flex;flex-direction:column;gap:16px;}
.pt-card{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.91);
  backdrop-filter:blur(24px) saturate(1.4);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:28px;padding:26px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.95),
    0 6px 32px rgba(0,0,0,0.065),
    0 1px 3px rgba(0,0,0,0.03);
  display:flex;flex-direction:column;gap:16px;
  transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s;
  animation:pt-card-in .44s ease both;
}
.pt-card:hover{transform:translateY(-5px);box-shadow:0 22px 56px rgba(0,0,0,0.09),inset 0 1px 0 rgba(255,255,255,.95);}
.pt-card-glow{position:absolute;inset:0;pointer-events:none;}

.pt-card-grid-top{display:flex;align-items:flex-start;gap:14px;position:relative;z-index:1;}
.pt-avatar{
  position:relative;width:60px;height:60px;border-radius:18px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:19px;font-weight:900;
  box-shadow:0 5px 20px rgba(0,0,0,0.20);
}
.pt-crown{position:absolute;top:-11px;right:-6px;font-size:16px;line-height:1;}
.pt-card-info{flex:1;min-width:0;}
.pt-card-name{font-size:16px;font-weight:900;color:#0f172a;letter-spacing:-.028em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-card-role{font-size:11px;color:#94a3b8;margin-top:2px;text-transform:capitalize;}
.pt-perf-badge{
  display:inline-flex;align-items:center;gap:4px;margin-top:7px;
  padding:4px 12px;border-radius:100px;font-size:11px;font-weight:800;
}
.pt-ring-wrap{position:relative;flex-shrink:0;}
.pt-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:12px;font-weight:900;
}

/* Quick stat row */
.pt-stat-row{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;
  position:relative;z-index:1;
}
.pt-stat-cell{
  background:rgba(248,250,252,0.8);border:1px solid rgba(0,0,0,0.05);
  border-radius:14px;padding:10px 12px;text-align:center;
}
.pt-stat-label{display:block;font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}
.pt-stat-val{display:block;font-size:13.5px;font-weight:900;color:#0f172a;letter-spacing:-.025em;}
.pt-stat-tgt{display:block;font-size:9.5px;color:#cbd5e1;margin-top:2px;}

.pt-metrics{display:flex;flex-direction:column;gap:11px;position:relative;z-index:1;}
.pt-metric-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.pt-metric-lbl{font-size:11.5px;font-weight:700;color:#475569;}
.pt-metric-val{font-size:12px;font-weight:800;color:#0f172a;}
.pt-metric-of{font-weight:500;color:#94a3b8;}
.pt-bar{height:6px;background:rgba(0,0,0,0.065);border-radius:99px;overflow:hidden;}
.pt-bar-fill{height:100%;border-radius:99px;transition:width 1.4s cubic-bezier(.34,1.56,.64,1);}

.pt-insight{
  display:flex;align-items:flex-start;gap:8px;
  background:linear-gradient(135deg,rgba(124,58,237,0.055),rgba(79,70,229,0.025));
  border:1px solid rgba(124,58,237,0.12);
  border-radius:14px;padding:12px 14px;
  font-size:12px;color:#4c1d95;line-height:1.60;
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
  background:rgba(255,255,255,0.90);backdrop-filter:blur(24px);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:26px;padding:22px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 6px 30px rgba(0,0,0,0.055);
}
.pt-tips-card{
  background:linear-gradient(135deg,rgba(124,58,237,0.07),rgba(79,70,229,0.03));
  border:1.5px solid rgba(124,58,237,0.14);
  border-radius:22px;padding:18px 20px;
}
.pt-tips-header{
  display:flex;align-items:center;gap:7px;
  font-size:10px;font-weight:800;color:#7c3aed;
  text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px;
}
.pt-tips-body{font-size:12.5px;color:#4c1d95;line-height:1.62;}

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
.pt-lrow:hover{background:rgba(124,58,237,0.045);}
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
  position:relative;overflow:hidden;text-align:center;
  background:rgba(255,255,255,0.86);
  backdrop-filter:blur(36px);
  border:1.5px solid rgba(124,58,237,0.10);
  border-radius:34px;padding:108px 60px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 10px 48px rgba(0,0,0,0.055);
}
@media(max-width:600px){.pt-empty{padding:72px 24px;}}
.pt-empty-halo{
  position:absolute;width:560px;height:560px;
  top:-120px;left:50%;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(124,58,237,0.14),transparent 62%);
  pointer-events:none;
}
.pt-empty-p{
  position:absolute;border-radius:50%;
  filter:blur(24px);animation:pt-float 16s ease-in-out infinite;
}
.pt-ep1{width:80px;height:80px;top:15%;left:8%;background:rgba(124,58,237,0.22);animation-delay:0s;}
.pt-ep2{width:56px;height:56px;top:26%;right:10%;background:rgba(79,70,229,0.18);animation-delay:6s;}
.pt-ep3{width:48px;height:48px;bottom:16%;left:44%;background:rgba(99,102,241,0.16);animation-delay:11s;}
@media(prefers-reduced-motion:reduce){.pt-empty-p{animation:none;}}

.pt-empty-icon-wrap{
  position:relative;display:inline-flex;align-items:center;justify-content:center;
  width:110px;height:110px;margin-bottom:28px;
}
.pt-empty-icon-ring{
  position:absolute;inset:0;border-radius:50%;
  background:linear-gradient(135deg,rgba(124,58,237,0.18),rgba(79,70,229,0.08));
  animation:pt-ring-pulse 3s ease-in-out infinite;
}
.pt-empty-icon-ring2{
  inset:12px;
  background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.05));
  animation:pt-ring-pulse 3s ease-in-out infinite 0.4s;
}
@keyframes pt-ring-pulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.08);opacity:.65;}}
@media(prefers-reduced-motion:reduce){.pt-empty-icon-ring,.pt-empty-icon-ring2{animation:none;}}
.pt-empty-icon{font-size:54px;animation:pt-empty-bob 3.8s ease-in-out infinite;position:relative;z-index:1;}
@keyframes pt-empty-bob{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-11px) scale(1.05);}}
@media(prefers-reduced-motion:reduce){.pt-empty-icon{animation:none;}}
.pt-empty-h{
  font-size:clamp(20px,2.8vw,28px);font-weight:900;letter-spacing:-.055em;margin-bottom:14px;
  background:linear-gradient(135deg,#0f172a,#7c3aed);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-empty-sub{font-size:14px;color:#64748b;max-width:480px;margin:0 auto;line-height:1.72;}
.pt-empty-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:22px;}
.pt-echip{
  background:rgba(124,58,237,0.07);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.17);
  border-radius:100px;padding:5px 14px;
  font-size:12px;font-weight:700;
}

/* ── Modal backdrop ───────────────────────────────────────── */
.pt-backdrop{
  position:fixed;inset:0;z-index:50;
  background:rgba(4,5,14,0.68);backdrop-filter:blur(18px) saturate(1.2);
  animation:pt-fade .22s ease;
}
@keyframes pt-fade{from{opacity:0;}to{opacity:1;}}

/* ── Modal panel ──────────────────────────────────────────── */
.pt-modal{
  position:fixed;top:50%;left:50%;z-index:60;
  transform:translate(-50%,-50%);
  width:min(800px,calc(100vw - 24px));
  max-height:92vh;overflow-y:auto;
  background:rgba(255,255,255,0.97);
  backdrop-filter:blur(60px) saturate(2);
  border:1.5px solid rgba(255,255,255,0.96);
  border-radius:34px;
  box-shadow:
    0 0 0 1.5px rgba(124,58,237,0.12),
    0 44px 120px rgba(4,5,14,0.32),
    inset 0 1px 0 #fff;
  animation:pt-modal-in .34s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pt-modal-in{from{opacity:0;transform:translate(-50%,-46%) scale(0.94);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}
.pt-modal::-webkit-scrollbar{width:4px;}
.pt-modal::-webkit-scrollbar-track{background:transparent;}
.pt-modal::-webkit-scrollbar-thumb{background:rgba(124,58,237,.22);border-radius:99px;}

.pt-mo{position:absolute;border-radius:50%;pointer-events:none;filter:blur(72px);}
.pt-mo1{width:400px;height:400px;top:-100px;right:-80px;background:radial-gradient(circle,rgba(124,58,237,0.20),transparent);opacity:.60;}
.pt-mo2{width:260px;height:260px;bottom:-70px;left:-50px;background:radial-gradient(circle,rgba(79,70,229,0.18),transparent);opacity:.52;}
.pt-mo3{width:180px;height:180px;top:40%;right:15%;background:radial-gradient(circle,rgba(6,182,212,0.14),transparent);opacity:.45;}

/* ── Modal header ─────────────────────────────────────────── */
.pt-modal-hd{
  display:flex;align-items:flex-start;gap:16px;
  padding:32px 36px 26px;
  border-bottom:1px solid rgba(0,0,0,0.06);
  position:relative;z-index:1;
}
.pt-modal-hd-icon{
  position:relative;
  width:54px;height:54px;border-radius:18px;flex-shrink:0;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(124,58,237,0.36);overflow:hidden;
}
.pt-modal-icon-glow{
  position:absolute;bottom:-12px;left:-12px;
  width:60px;height:60px;border-radius:50%;
  background:rgba(255,255,255,0.20);filter:blur(10px);
}
.pt-modal-title{font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-.034em;margin-bottom:4px;}
.pt-modal-sub{font-size:12.5px;color:#64748b;line-height:1.5;}
.pt-modal-x{
  margin-left:auto;flex-shrink:0;
  width:36px;height:36px;border-radius:11px;
  background:#f8fafc;border:1.5px solid #e2e8f0;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#64748b;transition:all .14s;
}
.pt-modal-x:hover{background:#fee2e2;border-color:#fecdd3;color:#e11d48;}

/* ── Modal body ───────────────────────────────────────────── */
.pt-modal-body{
  padding:28px 36px 34px;
  display:flex;flex-direction:column;gap:20px;
  position:relative;z-index:1;
}

/* ── 2-col modal layout ───────────────────────────────────── */
.pt-modal-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
@media(max-width:640px){.pt-modal-cols{grid-template-columns:1fr;}}

.pt-modal-form-col{display:flex;flex-direction:column;gap:18px;}
.pt-modal-preview-col{display:flex;flex-direction:column;gap:16px;}

/* ── Form fields ──────────────────────────────────────────── */
.pt-field{display:flex;flex-direction:column;gap:8px;}
.pt-flabel{
  display:flex;align-items:center;gap:5px;
  font-size:11px;font-weight:800;color:#334155;
  text-transform:uppercase;letter-spacing:.08em;
}
.pt-req{color:#e11d48;font-size:14px;line-height:1;}
.pt-opt{font-size:10px;color:#94a3b8;font-weight:600;text-transform:none;letter-spacing:0;}

.pt-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:520px){.pt-field-row{grid-template-columns:1fr;}}

.pt-select-wrap{position:relative;}
.pt-select{
  width:100%;appearance:none;
  background:rgba(248,250,252,0.97);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:13px 44px 13px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;cursor:pointer;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.pt-select.pt-select-ico{padding-left:42px;}
.pt-select:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.10);background:#fff;}
.pt-sel-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;}

.pt-inp-wrap{position:relative;}
.pt-inp-pre{
  position:absolute;left:15px;top:50%;transform:translateY(-50%);
  font-size:15px;pointer-events:none;z-index:1;color:#94a3b8;font-weight:700;
}
.pt-input{
  width:100%;
  background:rgba(248,250,252,0.97);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:13px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
.pt-input-pre{padding-left:42px;}
.pt-input:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.10);background:#fff;}
.pt-input::placeholder{color:#cbd5e1;font-weight:400;}

/* ── Suggest row ──────────────────────────────────────────── */
.pt-suggest-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pt-suggest-label{font-size:11px;font-weight:700;color:#94a3b8;}
.pt-suggest-chip{
  padding:4px 12px;border-radius:100px;border:1.5px solid rgba(124,58,237,0.20);
  background:rgba(124,58,237,0.06);color:#7c3aed;
  font-size:11.5px;font-weight:700;cursor:pointer;
  transition:all .14s;
}
.pt-suggest-chip:hover{background:rgba(124,58,237,0.12);border-color:rgba(124,58,237,0.30);}

/* ── AI prediction panel ──────────────────────────────────── */
.pt-ai-panel{
  background:linear-gradient(135deg,rgba(124,58,237,0.07),rgba(79,70,229,0.03));
  border:1.5px solid rgba(124,58,237,0.16);
  border-radius:22px;padding:18px 20px;
  display:flex;flex-direction:column;gap:13px;
  animation:pt-slide .22s ease;
}
.pt-ai-panel-header{
  display:flex;align-items:center;gap:7px;
  font-size:10px;font-weight:800;color:#7c3aed;
  text-transform:uppercase;letter-spacing:.09em;
}
.pt-ai-name{font-weight:700;color:#4f46e5;text-transform:none;letter-spacing:0;font-size:11px;}

.pt-ai-prob{display:flex;align-items:center;gap:13px;}
.pt-ai-prob-ring{position:relative;flex-shrink:0;}
.pt-ai-prob-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:11.5px;font-weight:900;color:#7c3aed;
}
.pt-ai-prob-label{font-size:13.5px;font-weight:800;color:#0f172a;margin-bottom:3px;}
.pt-ai-prob-sub{font-size:11.5px;color:#64748b;}

.pt-ai-meter-row{display:flex;align-items:center;gap:11px;}
.pt-ai-bar-bg{flex:1;height:7px;background:rgba(124,58,237,0.12);border-radius:99px;overflow:hidden;}
.pt-ai-bar-fill{
  height:100%;border-radius:99px;
  background:linear-gradient(90deg,#7c3aed,#4f46e5,#6366f1);
  transition:width .8s cubic-bezier(.34,1.56,.64,1);
}

.pt-ai-txt{font-size:12.5px;color:#4c1d95;line-height:1.62;}
.pt-ai-chips{display:flex;flex-wrap:wrap;gap:6px;}
.pt-ai-chip{
  background:rgba(124,58,237,0.08);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.17);
  border-radius:100px;padding:4px 11px;
  font-size:11px;font-weight:700;
}

/* Preview card */
.pt-preview-card{
  display:flex;align-items:center;gap:10px;
  background:rgba(255,255,255,0.80);
  border:1px solid rgba(255,255,255,0.95);
  border-radius:14px;padding:10px 13px;
  box-shadow:0 2px 8px rgba(0,0,0,0.05);
}
.pt-preview-av{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:12px;font-weight:900;
}
.pt-preview-name{font-size:13.5px;font-weight:800;color:#0f172a;}
.pt-preview-role{font-size:11px;color:#94a3b8;margin-top:1px;}

.pt-preview-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;text-align:center;
  background:rgba(248,250,252,0.80);
  border:1.5px dashed rgba(124,58,237,0.20);
  border-radius:22px;padding:28px 20px;min-height:180px;
}
.pt-preview-empty-icon{font-size:24px;opacity:.35;}
.pt-preview-empty-txt{font-size:12px;color:#94a3b8;line-height:1.65;max-width:200px;}

/* ── Submit ───────────────────────────────────────────────── */
.pt-submit{
  position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:17px;border:none;border-radius:20px;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#6366f1 100%);
  color:#fff;font-size:15px;font-weight:800;
  cursor:pointer;letter-spacing:-.01em;
  box-shadow:0 8px 32px rgba(124,58,237,0.40),0 2px 8px rgba(0,0,0,0.06);
  transition:transform .26s cubic-bezier(.34,1.56,.64,1),box-shadow .26s,background .3s;
}
.pt-submit:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 18px 50px rgba(124,58,237,0.52);}
.pt-submit:active:not(:disabled){transform:translateY(-1px);}
.pt-submit:disabled{opacity:.58;cursor:not-allowed;transform:none;}
.pt-submit.busy{animation:pt-busy .9s ease-in-out infinite;}
.pt-submit.done{background:linear-gradient(135deg,#10b981,#059669) !important;}
@keyframes pt-busy{0%,100%{opacity:1;}50%{opacity:.62;}}
.pt-submit-glow{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.20),transparent 52%);
  pointer-events:none;
}
.pt-spin{
  display:inline-block;width:16px;height:16px;border-radius:50%;
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
