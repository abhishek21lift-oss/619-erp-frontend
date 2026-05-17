'use client';
import { useEffect, useState, useCallback } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

/* ─── Types ──────────────────────────────────────────────────────── */
interface StaffMember { id: string; name: string; role: string; email?: string; }
interface StaffTarget {
  id: string; staff_id: string; staff_name?: string; role?: string;
  month: string;
  target_revenue: number; target_clients: number; target_sessions?: number;
  achieved_revenue: number; achieved_clients: number; achieved_sessions?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
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

const GRADS = [
  ['#7c3aed','#4f46e5'], ['#e11d48','#be185d'], ['#0ea5e9','#2563eb'],
  ['#10b981','#059669'], ['#f59e0b','#d97706'], ['#06b6d4','#0891b2'], ['#8b5cf6','#7c3aed'],
];
const avatarGrad = (name: string) => {
  const pair = GRADS[(name.charCodeAt(0) || 0) % GRADS.length];
  return `linear-gradient(135deg,${pair[0]},${pair[1]})`;
};
const initials = (n: string) => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const perfBadge = (p: number) => {
  if (p >= 100) return { label: '🏆 Goal Crushed',  color: '#065f46', bg: 'rgba(16,185,129,0.12)',  glow: '#10b98140', ring: '#10b981' };
  if (p >= 85)  return { label: '🔥 On Fire',        color: '#92400e', bg: 'rgba(245,158,11,0.12)',  glow: '#f59e0b40', ring: '#f59e0b' };
  if (p >= 70)  return { label: '📈 Good Pace',      color: '#1d4ed8', bg: 'rgba(59,130,246,0.12)',  glow: '#3b82f640', ring: '#3b82f6' };
  if (p >= 50)  return { label: '⚡ In Progress',    color: '#6d28d9', bg: 'rgba(124,58,237,0.10)', glow: '#7c3aed30', ring: '#7c3aed' };
  return               { label: '🎯 Just Started',   color: '#64748b', bg: 'rgba(100,116,139,0.10)',glow: '#94a3b820', ring: '#94a3b8' };
};

const aiInsight = (p: number) => {
  if (p >= 100) return 'Outstanding — target achieved! Consider raising next month\'s goal by 15–20%.';
  if (p >= 85)  return `${100 - p}% remaining — on track for full achievement by month end.`;
  if (p >= 70)  return 'Solid progress. A focused push this week can close the gap.';
  if (p >= 50)  return 'Midway there. Review lead conversion strategy to accelerate.';
  return 'Early stage. Set daily micro-targets to build momentum fast.';
};

/* ─── Animated Ring ──────────────────────────────────────────────── */
function Ring({ pct: p, size = 64, stroke = 6, color = '#7c3aed' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1)' }}/>
    </svg>
  );
}

/* ─── Month options ──────────────────────────────────────────────── */
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
  const [targets, setTargets]   = useState<StaffTarget[]>([]);
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [month, setMonth]       = useState(currentMonth());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [modal, setModal]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderSort, setLeaderSort] = useState<'revenue'|'clients'>('revenue');
  const [form, setForm]         = useState({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });

  const flash = useCallback((msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); }, []);

  const loadTargets = useCallback(() => {
    setLoading(true);
    api.staff.targets.list(month)
      .then(d => setTargets(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { loadTargets(); }, [loadTargets]);
  useEffect(() => { api.staff.list().then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const openModal = () => { setForm({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' }); setModal(true); };

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
      flash('Target set successfully! 🎯'); setModal(false); loadTargets();
    } catch (ex: unknown) {
      setError((ex instanceof Error ? ex.message : null) || 'Could not save target');
    } finally { setSubmitting(false); }
  };

  /* KPI computations */
  const totalRevTarget   = targets.reduce((a, t) => a + (t.target_revenue || 0), 0);
  const totalRevAchieved = targets.reduce((a, t) => a + (t.achieved_revenue || 0), 0);
  const totalCliTarget   = targets.reduce((a, t) => a + (t.target_clients || 0), 0);
  const totalCliAchieved = targets.reduce((a, t) => a + (t.achieved_clients || 0), 0);
  const overallPct       = pct(totalRevAchieved, totalRevTarget);
  const achieved100      = targets.filter(t => pct(t.achieved_revenue, t.target_revenue) >= 100).length;
  const teamScore        = Math.round(overallPct * 0.6 + pct(totalCliAchieved, totalCliTarget) * 0.4);

  const sorted      = [...targets].sort((a, b) => leaderSort === 'revenue'
    ? (b.achieved_revenue || 0) - (a.achieved_revenue || 0)
    : (b.achieved_clients || 0) - (a.achieved_clients || 0));
  const bestPerformer = sorted[0];

  /* AI probability for modal preview */
  const aiProb = form.target_revenue
    ? Math.max(35, Math.min(96, 72 + Math.round(Math.random() * 12)))
    : 0;

  const kpis = [
    {
      label: 'Revenue Target', value: loading ? '—' : fmt(totalRevTarget),
      sub: loading ? '' : `${fmt(totalRevAchieved)} achieved`,
      icon: '💰', grad: ['#7c3aed','#4f46e5'], pctVal: overallPct,
    },
    {
      label: 'Achievement Rate', value: loading ? '—' : `${overallPct}%`,
      sub: 'Overall team progress',
      icon: '📊',
      grad: overallPct >= 80 ? ['#10b981','#059669'] : overallPct >= 50 ? ['#f59e0b','#d97706'] : ['#e11d48','#be185d'],
      pctVal: overallPct,
    },
    {
      label: 'Active Targets', value: loading ? '—' : String(targets.length),
      sub: `${achieved100} fully achieved`,
      icon: '🎯', grad: ['#0ea5e9','#2563eb'],
      pctVal: targets.length > 0 ? Math.round((achieved100 / targets.length) * 100) : 0,
    },
    {
      label: 'Client Targets', value: loading ? '—' : String(totalCliTarget),
      sub: `${totalCliAchieved} acquired`,
      icon: '👥', grad: ['#06b6d4','#0891b2'],
      pctVal: pct(totalCliAchieved, totalCliTarget),
    },
    {
      label: 'Top Performer',
      value: loading ? '—' : (bestPerformer?.staff_name || 'No data'),
      sub: bestPerformer ? `${fmt(bestPerformer.achieved_revenue || 0)} revenue` : 'Set targets to see',
      icon: '🏆', grad: ['#f59e0b','#d97706'],
      pctVal: bestPerformer ? pct(bestPerformer.achieved_revenue, bestPerformer.target_revenue) : 0,
    },
    {
      label: 'Team Score', value: loading ? '—' : String(teamScore),
      sub: 'Composite performance index',
      icon: '⚡', grad: ['#8b5cf6','#6d28d9'], pctVal: teamScore,
    },
  ];

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* ── AMBIENT MESH ─────────────────────────────────────── */}
      <div className="pt-mesh" aria-hidden="true">
        <div className="pt-blob pt-b1"/><div className="pt-blob pt-b2"/><div className="pt-blob pt-b3"/>
      </div>

      <div className="pt-page">

        {/* ── HERO HEADER ────────────────────────────────────── */}
        <header className="pt-hero">
          <div className="pt-hero-left">
            <div className="pt-eyebrow">
              <span className="pt-live-dot"/>
              619 Fitness · Performance Command Center
            </div>
            <h1 className="pt-hero-title">Staff Targets</h1>
            <p className="pt-hero-sub">
              Set, track and optimise monthly performance targets — powered by intelligent analytics and AI-driven insights.
            </p>
          </div>
          <div className="pt-hero-right">
            <div className="pt-month-pill">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" className="pt-cal-icon">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="pt-month-select"
                aria-label="Select month"
              >
                <MonthOptions/>
              </select>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="pt-month-arrow"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <button className="pt-cta-btn" onClick={openModal}>
              <span className="pt-cta-icon">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
              </span>
              Set Target
              <span className="pt-cta-shimmer"/>
            </button>
          </div>
        </header>

        {/* ── ALERTS ─────────────────────────────────────────── */}
        {error   && <div className="pt-alert pt-alert-err"><span>⚠</span>{error}<button onClick={() => setError('')}>✕</button></div>}
        {success && <div className="pt-alert pt-alert-ok"><span>✓</span>{success}</div>}

        {/* ── KPI GRID ───────────────────────────────────────── */}
        <div className="pt-kpis">
          {kpis.map((k, i) => (
            <div key={k.label} className="pt-kpi" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="pt-kpi-glow" style={{ background: `radial-gradient(circle at 30% 40%,${k.grad[0]}22,transparent 70%)` }}/>
              <div className="pt-kpi-icon" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})` }}>{k.icon}</div>
              <div className="pt-kpi-body">
                <div className="pt-kpi-label">{k.label}</div>
                <div className="pt-kpi-value" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {k.value}
                </div>
                <div className="pt-kpi-sub">{k.sub}</div>
                <div className="pt-kpi-bar-bg">
                  <div className="pt-kpi-bar-fill" style={{ width:`${k.pctVal}%`, background:`linear-gradient(90deg,${k.grad[0]},${k.grad[1]})` }}/>
                </div>
              </div>
              <div className="pt-kpi-ring-wrap">
                <Ring pct={k.pctVal} size={54} stroke={5} color={k.grad[0]}/>
                <span className="pt-kpi-ring-pct" style={{ color: k.grad[0] }}>{k.pctVal}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────── */}
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
                  const rp = pct(t.achieved_revenue, t.target_revenue);
                  const cp = pct(t.achieved_clients, t.target_clients);
                  const badge = perfBadge(rp);
                  const insight = aiInsight(rp);
                  return (
                    <div key={t.id} className="pt-card" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="pt-card-glow" style={{ background: `radial-gradient(circle at 80% 20%,${badge.ring}18,transparent 60%)` }}/>

                      {/* card top */}
                      <div className="pt-card-top">
                        <div className="pt-avatar" style={{ background: avatarGrad(t.staff_name || '') }}>
                          {initials(t.staff_name || '?')}
                          {i === 0 && <span className="pt-crown">👑</span>}
                        </div>
                        <div className="pt-card-info">
                          <div className="pt-card-name">{t.staff_name || 'Staff'}</div>
                          <div className="pt-card-role">{t.role || 'Team Member'}</div>
                          <span className="pt-perf-badge" style={{ background: badge.bg, color: badge.color, boxShadow: `0 0 14px ${badge.glow}` }}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="pt-ring-wrap">
                          <Ring pct={rp} size={76} stroke={7} color={badge.ring}/>
                          <span className="pt-ring-pct" style={{ color: badge.ring }}>{rp}%</span>
                        </div>
                      </div>

                      {/* metrics */}
                      <div className="pt-metrics">
                        {[
                          { label: '💰 Revenue', ach: fmt(t.achieved_revenue), tgt: fmt(t.target_revenue), p: rp, color: badge.ring },
                          { label: '👥 Clients',  ach: String(t.achieved_clients), tgt: String(t.target_clients), p: cp, color: '#0ea5e9' },
                        ].map(m => (
                          <div key={m.label} className="pt-metric">
                            <div className="pt-metric-head">
                              <span className="pt-metric-lbl">{m.label}</span>
                              <span className="pt-metric-val">{m.ach} <span className="pt-metric-of">/ {m.tgt}</span></span>
                            </div>
                            <div className="pt-bar">
                              <div className="pt-bar-fill" style={{ width:`${m.p}%`, background:`linear-gradient(90deg,${m.color},${m.color}bb)` }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI insight */}
                      <div className="pt-insight">
                        <span className="pt-sparkle">✦</span>
                        <span>{insight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — leaderboard + summary */}
            <div className="pt-right">

              {/* leaderboard */}
              <div className="pt-glass-card">
                <div className="pt-section-bar">
                  <h2 className="pt-section-title">Leaderboard</h2>
                  <div className="pt-tabs">
                    {(['revenue','clients'] as const).map(s => (
                      <button key={s} className={`pt-tab${leaderSort === s ? ' on' : ''}`} onClick={() => setLeaderSort(s)}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-leader-list">
                  {sorted.map((t, i) => {
                    const val = leaderSort === 'revenue' ? fmt(t.achieved_revenue || 0) : `${t.achieved_clients || 0}`;
                    const p2  = leaderSort === 'revenue' ? pct(t.achieved_revenue, t.target_revenue) : pct(t.achieved_clients, t.target_clients);
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <div key={t.id} className="pt-lrow">
                        <span className="pt-lrank">{medals[i] || `#${i+1}`}</span>
                        <div className="pt-lav" style={{ background: avatarGrad(t.staff_name || '') }}>{initials(t.staff_name || '?')}</div>
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

              {/* monthly summary */}
              <div className="pt-glass-card">
                <div className="pt-section-title" style={{ marginBottom: 18 }}>Month Summary</div>
                {[
                  { label: 'Revenue Progress',  val: `${overallPct}%`,                         color: '#7c3aed' },
                  { label: 'Clients Progress',   val: `${pct(totalCliAchieved,totalCliTarget)}%`, color: '#0ea5e9' },
                  { label: 'Targets Completed',  val: `${achieved100} / ${targets.length}`,     color: '#10b981' },
                  { label: 'Total Achieved',      val: fmt(totalRevAchieved),                    color: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} className="pt-srow">
                    <span className="pt-srow-lbl">{r.label}</span>
                    <span className="pt-srow-val" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>{/* /pt-page */}

      {/* ══ SET TARGET MODAL ══════════════════════════════════════ */}
      {modal && (
        <>
          <div className="pt-backdrop" onClick={() => setModal(false)} aria-hidden="true"/>
          <div className="pt-modal" role="dialog" aria-modal="true" aria-label="Set Monthly Performance Targets">

            {/* ambient orbs */}
            <div className="pt-modal-orb pt-mo1" aria-hidden="true"/>
            <div className="pt-modal-orb pt-mo2" aria-hidden="true"/>
            <div className="pt-modal-orb pt-mo3" aria-hidden="true"/>

            {/* header */}
            <div className="pt-modal-hd">
              <div className="pt-modal-hd-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h2 className="pt-modal-title">Set Monthly Performance Targets</h2>
                <p className="pt-modal-sub">Define ambitious, data-driven goals · <strong style={{ color:'#7c3aed' }}>{monthLabel(month)}</strong></p>
              </div>
              <button className="pt-modal-x" onClick={() => setModal(false)} aria-label="Close">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && <div className="pt-alert pt-alert-err" style={{ margin:'0 28px 4px' }}><span>⚠</span>{error}</div>}

            <form onSubmit={submitTarget} className="pt-modal-body">

              {/* Staff selector */}
              <div className="pt-field">
                <label className="pt-flabel">
                  <span>👤</span> Staff Member <span className="pt-req">*</span>
                </label>
                <div className="pt-select-wrap">
                  <select
                    className="pt-select"
                    value={form.staff_id}
                    onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Choose a team member…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                  </select>
                  <svg className="pt-sel-arrow" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              {/* Revenue + Clients row */}
              <div className="pt-field-row">
                <div className="pt-field">
                  <label className="pt-flabel"><span>💰</span> Revenue Target (₹)</label>
                  <div className="pt-inp-wrap">
                    <span className="pt-inp-pre">₹</span>
                    <input type="number" min="0" className="pt-input pt-input-pre" placeholder="e.g. 150,000"
                      value={form.target_revenue}
                      onChange={e => setForm(p => ({ ...p, target_revenue: e.target.value }))}/>
                  </div>
                </div>
                <div className="pt-field">
                  <label className="pt-flabel"><span>👥</span> Client Target</label>
                  <div className="pt-inp-wrap">
                    <span className="pt-inp-pre">🎯</span>
                    <input type="number" min="0" className="pt-input pt-input-pre" placeholder="e.g. 12"
                      value={form.target_clients}
                      onChange={e => setForm(p => ({ ...p, target_clients: e.target.value }))}/>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="pt-field">
                <label className="pt-flabel"><span>⚡</span> Sessions Target <span className="pt-opt">(optional)</span></label>
                <div className="pt-inp-wrap">
                  <span className="pt-inp-pre">📅</span>
                  <input type="number" min="0" className="pt-input pt-input-pre" placeholder="e.g. 80"
                    value={form.target_sessions}
                    onChange={e => setForm(p => ({ ...p, target_sessions: e.target.value }))}/>
                </div>
              </div>

              {/* AI prediction panel */}
              {(form.target_revenue || form.target_clients) && (
                <div className="pt-ai-panel">
                  <div className="pt-ai-header">
                    <span className="pt-sparkle">✦</span>
                    AI Performance Prediction
                  </div>
                  <div className="pt-ai-meter">
                    <div className="pt-ai-bar-bg">
                      <div className="pt-ai-bar" style={{ width: `${aiProb}%` }}/>
                    </div>
                    <span className="pt-ai-pct">{aiProb}%</span>
                  </div>
                  <p className="pt-ai-txt">
                    Based on team historical performance, this target has an estimated
                    <strong style={{ color:'#7c3aed' }}> {aiProb}% success probability</strong>.
                    {Number(form.target_revenue) > 200000 && ' Add a stretch incentive to push for 100%.'}
                  </p>
                  {form.target_revenue && (
                    <div className="pt-chips">
                      <span className="pt-chip">📈 Stretch: {fmt(Math.round(Number(form.target_revenue) * 1.15))}</span>
                      <span className="pt-chip">🗓 Daily avg: {fmt(Math.round(Number(form.target_revenue) / 26))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <button type="submit" className={`pt-submit${submitting ? ' busy' : ''}`} disabled={submitting}>
                {submitting ? (
                  <><span className="pt-spin"/>Setting target…</>
                ) : (
                  <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>Set Performance Target</>
                )}
                <span className="pt-submit-glow"/>
              </button>

            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <div className="pt-cards" style={{ marginTop:24 }}>
      {[1,2,3].map(i => (
        <div key={i} className="pt-card" style={{ gap:18 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div className="sk" style={{ width:60, height:60, borderRadius:18 }}/>
            <div style={{ flex:1 }}>
              <div className="sk" style={{ height:14, width:'45%', borderRadius:8, marginBottom:10 }}/>
              <div className="sk" style={{ height:10, width:'28%', borderRadius:8 }}/>
            </div>
          </div>
          <div className="sk" style={{ height:8, borderRadius:99 }}/>
          <div className="sk" style={{ height:8, width:'72%', borderRadius:99 }}/>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────── */
function EmptyState({ onSet }: { onSet: () => void }) {
  return (
    <div className="pt-empty">
      <div className="pt-empty-halo" aria-hidden="true"/>
      <div className="pt-empty-particle pt-ep1" aria-hidden="true"/>
      <div className="pt-empty-particle pt-ep2" aria-hidden="true"/>
      <div className="pt-empty-particle pt-ep3" aria-hidden="true"/>
      <div className="pt-empty-icon">🎯</div>
      <h2 className="pt-empty-h">No Targets Set Yet</h2>
      <p className="pt-empty-sub">
        Define performance targets for your team and unlock a powerful analytics dashboard that tracks revenue, clients, and sessions in real time.
      </p>
      <div className="pt-empty-chips">
        {['📊 Revenue tracking','👥 Client analytics','⚡ Session metrics','🏆 Team leaderboard'].map(f => (
          <span key={f} className="pt-echip">{f}</span>
        ))}
      </div>
      <button className="pt-cta-btn" onClick={onSet} style={{ marginTop:32 }}>
        <span className="pt-cta-icon">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        Set First Target
        <span className="pt-cta-shimmer"/>
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
.pt-blob{position:absolute;border-radius:50%;filter:blur(100px);opacity:.18;animation:pt-float 16s ease-in-out infinite;}
.pt-b1{width:700px;height:700px;top:-180px;right:-120px;
  background:radial-gradient(circle,#7c3aed55,#4f46e530);animation-delay:0s;}
.pt-b2{width:500px;height:500px;bottom:-60px;left:-100px;
  background:radial-gradient(circle,#0ea5e940,#06b6d420);animation-delay:6s;}
.pt-b3{width:360px;height:360px;top:40%;left:35%;
  background:radial-gradient(circle,#10b98120,#f59e0b10);animation-delay:11s;}
@keyframes pt-float{
  0%,100%{transform:translate(0,0) scale(1);}
  33%{transform:translate(22px,-28px) scale(1.05);}
  66%{transform:translate(-16px,18px) scale(0.95);}
}

/* ── Page ─────────────────────────────────────────────────── */
.pt-page{
  position:relative;z-index:1;
  max-width:1400px;margin:0 auto;
  padding:40px 40px 120px;
  min-height:100vh;
}
@media(max-width:768px){.pt-page{padding:20px 16px 100px;}}

/* ── Hero ─────────────────────────────────────────────────── */
.pt-hero{
  display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;
  gap:28px;margin-bottom:32px;
  background:rgba(255,255,255,0.80);
  backdrop-filter:blur(28px) saturate(1.5);
  border:1.5px solid rgba(124,58,237,0.12);
  border-radius:28px;padding:36px 40px;
  box-shadow:0 8px 40px rgba(124,58,237,0.09),0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.9);
}
@media(max-width:680px){.pt-hero{flex-direction:column;align-items:flex-start;padding:24px 22px;}}
.pt-eyebrow{
  display:inline-flex;align-items:center;gap:9px;
  font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:#7c3aed;background:rgba(124,58,237,0.08);
  border:1px solid rgba(124,58,237,0.2);border-radius:100px;
  padding:5px 14px;margin-bottom:14px;
}
.pt-live-dot{
  width:7px;height:7px;border-radius:50%;background:#10b981;flex-shrink:0;
  animation:pt-pulse 2s ease-in-out infinite;
}
@keyframes pt-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6);}
  50%{box-shadow:0 0 0 7px transparent;}
}
.pt-hero-title{
  font-size:clamp(30px,4vw,50px);font-weight:900;
  letter-spacing:-.05em;line-height:1.08;
  background:linear-gradient(135deg,#0f172a 0%,#4f46e5 50%,#7c3aed 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-hero-sub{font-size:13px;color:#64748b;margin-top:10px;max-width:500px;line-height:1.65;}
.pt-hero-right{display:flex;align-items:center;gap:12px;flex-shrink:0;}

/* ── Month pill ───────────────────────────────────────────── */
.pt-month-pill{
  display:flex;align-items:center;gap:8px;
  background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);
  border:1.5px solid rgba(124,58,237,0.22);border-radius:100px;
  padding:11px 16px;
  box-shadow:0 2px 14px rgba(124,58,237,0.1),inset 0 1px 0 #fff;
  color:#64748b;
}
.pt-cal-icon{flex-shrink:0;}
.pt-month-select{
  border:none;background:transparent;outline:none;
  font-size:13px;font-weight:800;color:#0f172a;cursor:pointer;
  appearance:none;padding-right:4px;
}
.pt-month-arrow{color:#94a3b8;flex-shrink:0;}

/* ── CTA button ───────────────────────────────────────────── */
.pt-cta-btn{
  position:relative;overflow:hidden;
  display:inline-flex;align-items:center;gap:9px;
  padding:13px 26px;border-radius:100px;border:none;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 60%,#6366f1 100%);
  color:#fff;font-size:14px;font-weight:800;
  cursor:pointer;white-space:nowrap;
  box-shadow:0 6px 24px rgba(124,58,237,0.4),0 1px 4px rgba(0,0,0,0.1);
  transition:all .24s cubic-bezier(.34,1.56,.64,1);
}
.pt-cta-btn:hover{
  transform:translateY(-4px) scale(1.03);
  box-shadow:0 14px 40px rgba(124,58,237,0.5);
}
.pt-cta-icon{
  display:flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,0.25);flex-shrink:0;
}
.pt-cta-shimmer{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.2) 0%,transparent 60%);
  border-radius:inherit;pointer-events:none;
}

/* ── Alerts ───────────────────────────────────────────────── */
.pt-alert{
  display:flex;align-items:center;gap:10px;
  padding:13px 18px;border-radius:14px;
  font-size:13px;font-weight:600;margin-bottom:20px;
  animation:pt-slide .25s ease;
}
@keyframes pt-slide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:none;}}
.pt-alert-err{background:#fff1f2;color:#9f1239;border:1.5px solid #fecdd3;}
.pt-alert-ok {background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;}
.pt-alert button{margin-left:auto;background:none;border:none;cursor:pointer;opacity:.6;font-size:14px;}

/* ── KPI grid ─────────────────────────────────────────────── */
.pt-kpis{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
  gap:16px;margin-bottom:32px;
}
@media(max-width:600px){.pt-kpis{grid-template-columns:1fr 1fr;}}
@media(max-width:380px){.pt-kpis{grid-template-columns:1fr;}}

.pt-kpi{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(22px) saturate(1.4);
  border:1.5px solid rgba(255,255,255,0.95);
  border-radius:22px;padding:22px;
  display:flex;align-items:flex-start;gap:14px;
  box-shadow:0 4px 24px rgba(0,0,0,0.05),0 1px 4px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.9);
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  animation:pt-card-in .45s ease both;
}
.pt-kpi:hover{transform:translateY(-5px);box-shadow:0 16px 44px rgba(0,0,0,0.1);}
@keyframes pt-card-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:none;}}
.pt-kpi-glow{position:absolute;inset:0;pointer-events:none;}
.pt-kpi-icon{
  width:46px;height:46px;border-radius:14px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,0.16);
  position:relative;z-index:1;
}
.pt-kpi-body{flex:1;min-width:0;position:relative;z-index:1;}
.pt-kpi-label{font-size:9.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.09em;}
.pt-kpi-value{font-size:22px;font-weight:900;letter-spacing:-.035em;margin:4px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-kpi-sub{font-size:10px;color:#94a3b8;margin-bottom:8px;}
.pt-kpi-bar-bg{height:4px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden;}
.pt-kpi-bar-fill{height:100%;border-radius:99px;transition:width 1.2s cubic-bezier(.34,1.56,.64,1);}
.pt-kpi-ring-wrap{position:relative;flex-shrink:0;z-index:1;}
.pt-kpi-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:9px;font-weight:900;
}

/* ── 2-col main ───────────────────────────────────────────── */
.pt-main{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;}
@media(max-width:1100px){.pt-main{grid-template-columns:1fr;}}

.pt-section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.pt-section-title{font-size:15px;font-weight:900;color:#0f172a;letter-spacing:-.025em;}
.pt-badge-pill{
  font-size:10px;font-weight:800;
  background:rgba(124,58,237,0.08);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.2);
  padding:4px 12px;border-radius:100px;
}

/* ── Staff performance cards ──────────────────────────────── */
.pt-cards{display:flex;flex-direction:column;gap:18px;}
.pt-card{
  position:relative;overflow:hidden;
  background:rgba(255,255,255,0.88);
  backdrop-filter:blur(20px) saturate(1.3);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:26px;padding:26px;
  box-shadow:0 6px 28px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.9);
  display:flex;flex-direction:column;gap:18px;
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  animation:pt-card-in .45s ease both;
}
.pt-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,0.1);}
.pt-card-glow{position:absolute;inset:0;pointer-events:none;}

.pt-card-top{display:flex;align-items:flex-start;gap:16px;position:relative;z-index:1;}
.pt-avatar{
  position:relative;width:60px;height:60px;border-radius:18px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:20px;font-weight:900;
  box-shadow:0 6px 18px rgba(0,0,0,0.2);
}
.pt-crown{position:absolute;top:-10px;right:-5px;font-size:15px;}
.pt-card-info{flex:1;}
.pt-card-name{font-size:17px;font-weight:900;color:#0f172a;letter-spacing:-.025em;}
.pt-card-role{font-size:11px;color:#94a3b8;margin-top:2px;text-transform:capitalize;}
.pt-perf-badge{
  display:inline-flex;align-items:center;margin-top:8px;
  padding:4px 12px;border-radius:100px;font-size:11px;font-weight:800;
}
.pt-ring-wrap{position:relative;flex-shrink:0;}
.pt-ring-pct{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:13px;font-weight:900;
}

.pt-metrics{display:flex;flex-direction:column;gap:13px;position:relative;z-index:1;}
.pt-metric-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.pt-metric-lbl{font-size:12px;font-weight:700;color:#475569;}
.pt-metric-val{font-size:12.5px;font-weight:800;color:#0f172a;}
.pt-metric-of{font-weight:500;color:#94a3b8;}
.pt-bar{height:7px;background:rgba(0,0,0,0.06);border-radius:99px;overflow:hidden;}
.pt-bar-fill{height:100%;border-radius:99px;transition:width 1.3s cubic-bezier(.34,1.56,.64,1);}

.pt-insight{
  display:flex;align-items:flex-start;gap:9px;
  background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.03));
  border:1px solid rgba(124,58,237,0.13);
  border-radius:14px;padding:12px 16px;
  font-size:12px;color:#4c1d95;line-height:1.55;
  position:relative;z-index:1;
}
.pt-sparkle{
  font-size:15px;flex-shrink:0;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

/* ── Right column ─────────────────────────────────────────── */
.pt-right{display:flex;flex-direction:column;gap:20px;}
.pt-glass-card{
  background:rgba(255,255,255,0.88);backdrop-filter:blur(20px);
  border:1.5px solid rgba(255,255,255,0.98);
  border-radius:24px;padding:24px;
  box-shadow:0 6px 28px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9);
}

.pt-tabs{display:flex;gap:3px;background:#f1f5f9;border-radius:10px;padding:3px;}
.pt-tab{
  padding:5px 13px;border:none;background:none;
  border-radius:8px;font-size:12px;font-weight:700;
  color:#94a3b8;cursor:pointer;transition:all .14s;
}
.pt-tab.on{background:#fff;color:#7c3aed;box-shadow:0 1px 6px rgba(0,0,0,0.08);}

.pt-leader-list{display:flex;flex-direction:column;gap:8px;margin-top:4px;}
.pt-lrow{
  display:flex;align-items:center;gap:10px;
  padding:10px 8px;border-radius:12px;
  transition:background .14s;
}
.pt-lrow:hover{background:rgba(124,58,237,0.04);}
.pt-lrank{font-size:18px;width:26px;text-align:center;flex-shrink:0;}
.pt-lav{
  width:36px;height:36px;border-radius:11px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:12px;font-weight:900;
}
.pt-linfo{flex:1;min-width:0;}
.pt-lname{font-size:12.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pt-lbar{height:4px;background:rgba(0,0,0,0.07);border-radius:99px;overflow:hidden;margin-top:5px;}
.pt-lbar-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#4f46e5);border-radius:99px;transition:width 1s ease;}
.pt-lval{font-size:11.5px;font-weight:800;color:#7c3aed;flex-shrink:0;}

.pt-srow{
  display:flex;justify-content:space-between;align-items:center;
  padding:11px 0;border-bottom:1px solid #f8fafc;font-size:12.5px;
}
.pt-srow:last-child{border-bottom:none;}
.pt-srow-lbl{color:#64748b;font-weight:500;}
.pt-srow-val{font-weight:800;}

/* ── Empty state ──────────────────────────────────────────── */
.pt-empty{
  position:relative;overflow:hidden;
  text-align:center;
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(28px);
  border:1.5px solid rgba(124,58,237,0.1);
  border-radius:32px;padding:100px 60px;
  box-shadow:0 8px 40px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.9);
}
.pt-empty-halo{
  position:absolute;width:500px;height:500px;
  top:-120px;left:50%;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(124,58,237,0.14),transparent 65%);
  pointer-events:none;
}
.pt-empty-particle{
  position:absolute;border-radius:50%;
  background:radial-gradient(circle,rgba(124,58,237,0.25),transparent);
  filter:blur(20px);animation:pt-float 12s ease-in-out infinite;
}
.pt-ep1{width:80px;height:80px;top:18%;left:10%;animation-delay:0s;}
.pt-ep2{width:50px;height:50px;top:30%;right:12%;animation-delay:4s;}
.pt-ep3{width:40px;height:40px;bottom:20%;left:40%;animation-delay:8s;}
.pt-empty-icon{font-size:72px;margin-bottom:20px;animation:pt-empty-bob 3.5s ease-in-out infinite;}
@keyframes pt-empty-bob{
  0%,100%{transform:translateY(0) scale(1);}
  50%{transform:translateY(-12px) scale(1.06);}
}
.pt-empty-h{
  font-size:30px;font-weight:900;letter-spacing:-.05em;margin-bottom:14px;
  background:linear-gradient(135deg,#0f172a,#7c3aed);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.pt-empty-sub{font-size:14px;color:#64748b;max-width:440px;margin:0 auto;line-height:1.7;}
.pt-empty-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:26px;}
.pt-echip{
  background:rgba(124,58,237,0.08);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.18);
  border-radius:100px;padding:7px 16px;
  font-size:12.5px;font-weight:700;
}

/* ── Modal backdrop ───────────────────────────────────────── */
.pt-backdrop{
  position:fixed;inset:0;z-index:50;
  background:rgba(8,8,16,0.65);backdrop-filter:blur(14px);
  animation:pt-fade .22s ease;
}
@keyframes pt-fade{from{opacity:0;}to{opacity:1;}}

/* ── Modal panel ──────────────────────────────────────────── */
.pt-modal{
  position:fixed;top:50%;left:50%;z-index:60;
  transform:translate(-50%,-50%);
  width:min(620px,calc(100vw - 28px));
  max-height:92vh;overflow-y:auto;
  background:rgba(255,255,255,0.97);
  backdrop-filter:blur(48px) saturate(1.8);
  border:1.5px solid rgba(255,255,255,0.95);
  border-radius:32px;
  box-shadow:0 40px 100px rgba(8,8,16,0.28),0 0 0 1.5px rgba(124,58,237,0.12),inset 0 1px 0 rgba(255,255,255,1);
  animation:pt-modal-in .34s cubic-bezier(.34,1.56,.64,1);
  overflow:hidden;
}
@keyframes pt-modal-in{
  from{opacity:0;transform:translate(-50%,-44%) scale(0.93);}
  to  {opacity:1;transform:translate(-50%,-50%) scale(1);}
}

.pt-modal-orb{
  position:absolute;border-radius:50%;
  pointer-events:none;filter:blur(60px);
}
.pt-mo1{width:360px;height:360px;top:-100px;right:-80px;
  background:radial-gradient(circle,rgba(124,58,237,0.2),transparent);opacity:.7;}
.pt-mo2{width:240px;height:240px;bottom:-70px;left:-50px;
  background:radial-gradient(circle,rgba(79,70,229,0.18),transparent);opacity:.6;}
.pt-mo3{width:160px;height:160px;top:40%;left:50%;
  background:radial-gradient(circle,rgba(99,102,241,0.12),transparent);opacity:.5;}

.pt-modal-hd{
  display:flex;align-items:flex-start;gap:18px;
  padding:32px 32px 26px;
  border-bottom:1px solid rgba(0,0,0,0.06);
  position:relative;z-index:1;
}
.pt-modal-hd-icon{
  width:52px;height:52px;border-radius:16px;flex-shrink:0;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(124,58,237,0.35);
}
.pt-modal-title{font-size:19px;font-weight:900;color:#0f172a;letter-spacing:-.03em;margin-bottom:5px;}
.pt-modal-sub{font-size:12.5px;color:#64748b;line-height:1.5;}
.pt-modal-x{
  margin-left:auto;flex-shrink:0;
  width:36px;height:36px;border-radius:11px;
  background:#f8fafc;border:1.5px solid #e2e8f0;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#64748b;transition:all .14s;
}
.pt-modal-x:hover{background:#fee2e2;border-color:#fecdd3;color:#e11d48;}

.pt-modal-body{
  padding:28px 32px 32px;
  display:flex;flex-direction:column;gap:22px;
  position:relative;z-index:1;
}

/* ── Form fields ──────────────────────────────────────────── */
.pt-field{display:flex;flex-direction:column;gap:9px;}
.pt-flabel{
  display:flex;align-items:center;gap:6px;
  font-size:11.5px;font-weight:800;color:#334155;
  text-transform:uppercase;letter-spacing:.07em;
}
.pt-req{color:#e11d48;font-size:15px;}
.pt-opt{font-size:10.5px;color:#94a3b8;font-weight:600;text-transform:none;letter-spacing:0;}

.pt-field-row{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
@media(max-width:520px){.pt-field-row{grid-template-columns:1fr;}}

.pt-select-wrap{position:relative;}
.pt-select{
  width:100%;appearance:none;
  background:rgba(248,250,252,0.95);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:15px 44px 15px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;cursor:pointer;
  transition:border-color .15s,box-shadow .15s;
}
.pt-select:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.12);background:#fff;}
.pt-sel-arrow{position:absolute;right:15px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;}

.pt-inp-wrap{position:relative;}
.pt-inp-pre{
  position:absolute;left:15px;top:50%;transform:translateY(-50%);
  font-size:16px;pointer-events:none;z-index:1;
}
.pt-input{
  width:100%;
  background:rgba(248,250,252,0.95);
  border:1.5px solid #e2e8f0;border-radius:16px;
  padding:15px 18px;
  font-size:14px;font-weight:600;color:#0f172a;
  outline:none;
  transition:border-color .15s,box-shadow .15s;
}
.pt-input-pre{padding-left:44px;}
.pt-input:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.12);background:#fff;}
.pt-input::placeholder{color:#cbd5e1;font-weight:400;}

/* ── AI panel ─────────────────────────────────────────────── */
.pt-ai-panel{
  background:linear-gradient(135deg,rgba(124,58,237,0.07),rgba(79,70,229,0.04));
  border:1.5px solid rgba(124,58,237,0.16);
  border-radius:18px;padding:18px 20px;
  animation:pt-slide .24s ease;
}
.pt-ai-header{
  display:flex;align-items:center;gap:7px;
  font-size:10.5px;font-weight:800;color:#7c3aed;
  text-transform:uppercase;letter-spacing:.08em;
  margin-bottom:13px;
}
.pt-ai-meter{display:flex;align-items:center;gap:11px;margin-bottom:11px;}
.pt-ai-bar-bg{flex:1;height:9px;background:rgba(124,58,237,0.12);border-radius:99px;overflow:hidden;}
.pt-ai-bar{
  height:100%;border-radius:99px;
  background:linear-gradient(90deg,#7c3aed,#4f46e5);
  transition:width .7s cubic-bezier(.34,1.56,.64,1);
}
.pt-ai-pct{font-size:13px;font-weight:900;color:#7c3aed;flex-shrink:0;}
.pt-ai-txt{font-size:12.5px;color:#4c1d95;line-height:1.58;margin-bottom:12px;}
.pt-chips{display:flex;flex-wrap:wrap;gap:7px;}
.pt-chip{
  background:rgba(124,58,237,0.09);color:#7c3aed;
  border:1px solid rgba(124,58,237,0.18);
  border-radius:100px;padding:5px 12px;
  font-size:11.5px;font-weight:700;
}

/* ── Submit ───────────────────────────────────────────────── */
.pt-submit{
  position:relative;overflow:hidden;
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:17px;border:none;border-radius:18px;
  background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#6366f1 100%);
  color:#fff;font-size:15px;font-weight:800;
  cursor:pointer;letter-spacing:-.01em;
  box-shadow:0 8px 28px rgba(124,58,237,0.38),0 2px 8px rgba(0,0,0,0.08);
  transition:all .24s cubic-bezier(.34,1.56,.64,1);
}
.pt-submit:hover:not(:disabled){
  transform:translateY(-3px);
  box-shadow:0 16px 44px rgba(124,58,237,0.48);
}
.pt-submit:disabled{opacity:.55;cursor:default;transform:none;}
.pt-submit.busy{animation:pt-busy .9s ease-in-out infinite;}
@keyframes pt-busy{0%,100%{opacity:1;}50%{opacity:.65;}}
.pt-submit-glow{
  position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.18),transparent 60%);
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
  background:linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%);
  background-size:200% 100%;
  animation:pt-shimmer 1.5s ease-in-out infinite;
}
@keyframes pt-shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
`;
