'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

/* ─── Types ──────────────────────────────────────────────────────── */
interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
}
interface StaffTarget {
  id: string;
  staff_id: string;
  staff_name?: string;
  role?: string;
  month: string; // YYYY-MM
  target_revenue: number;
  target_clients: number;
  target_sessions?: number;
  achieved_revenue: number;
  achieved_clients: number;
  achieved_sessions?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const pct = (achieved: number, target: number) =>
  target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 0;

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const AVATAR_GRADS = [
  ['#7c3aed','#4f46e5'],['#e11d48','#be185d'],['#0ea5e9','#2563eb'],
  ['#10b981','#059669'],['#f59e0b','#d97706'],['#06b6d4','#0891b2'],['#8b5cf6','#7c3aed'],
];
const avatarGrad = (name: string) => {
  const pair = AVATAR_GRADS[(name.charCodeAt(0) || 0) % AVATAR_GRADS.length];
  return `linear-gradient(135deg,${pair[0]},${pair[1]})`;
};
const initials = (n: string) => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const perfBadge = (p: number): { label: string; color: string; bg: string; glow: string } => {
  if (p >= 100) return { label: '🏆 Goal Crushed',  color: '#065f46', bg: 'rgba(16,185,129,0.12)', glow: '#10b98140' };
  if (p >= 85)  return { label: '🔥 On Fire',        color: '#92400e', bg: 'rgba(245,158,11,0.12)', glow: '#f59e0b40' };
  if (p >= 70)  return { label: '📈 Good Pace',      color: '#1d4ed8', bg: 'rgba(59,130,246,0.12)', glow: '#3b82f640' };
  if (p >= 50)  return { label: '⚡ In Progress',    color: '#6d28d9', bg: 'rgba(124,58,237,0.10)', glow: '#7c3aed30' };
  return         { label: '🎯 Just Started',         color: '#64748b', bg: 'rgba(100,116,139,0.10)', glow: '#94a3b820' };
};

const aiInsight = (p: number): string => {
  if (p >= 100) return 'Outstanding — target achieved! Consider raising next month\'s goal by 15-20%.';
  if (p >= 85)  return `${100 - p}% remaining — on track for full achievement by month end.`;
  if (p >= 70)  return 'Solid progress. A focused push this week can close the gap.';
  if (p >= 50)  return 'Midway there. Recommended: review lead conversion strategy.';
  return 'Early stage. Setting daily micro-targets can accelerate momentum.';
};

/* ─── Ring chart helper ──────────────────────────────────────────── */
function Ring({ pct: p, size = 64, stroke = 6, color = '#7c3aed' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
    </svg>
  );
}

/* ─── Main export ────────────────────────────────────────────────── */
export default function StaffTargetsPage() {
  return <Guard><Inner /></Guard>;
}

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

  /* form state */
  const [form, setForm] = useState({
    staff_id: '', target_revenue: '', target_clients: '', target_sessions: '',
  });

  const flash = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const loadTargets = useCallback(() => {
    setLoading(true);
    api.staff.targets.list(month)
      .then(d => setTargets(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load targets'))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { loadTargets(); }, [loadTargets]);
  useEffect(() => {
    api.staff.list().then(d => setStaff(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const openModal = () => {
    setForm({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });
    setModal(true);
  };

  const submitTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staff_id) return setError('Please select a staff member');
    setSubmitting(true); setError('');
    try {
      await api.staff.targets.create({
        staff_id: form.staff_id,
        month,
        target_revenue: Number(form.target_revenue) || 0,
        target_clients: Number(form.target_clients) || 0,
        target_sessions: Number(form.target_sessions) || 0,
        achieved_revenue: 0,
        achieved_clients: 0,
        achieved_sessions: 0,
      });
      flash('Target set successfully! 🎯');
      setModal(false);
      loadTargets();
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
  const activeTargets    = targets.length;
  const achieved100      = targets.filter(t => pct(t.achieved_revenue, t.target_revenue) >= 100).length;

  const sorted = [...targets].sort((a, b) => {
    if (leaderSort === 'revenue') return (b.achieved_revenue||0) - (a.achieved_revenue||0);
    return (b.achieved_clients||0) - (a.achieved_clients||0);
  });

  const bestPerformer = sorted[0];

  /* preview in modal */
  const previewPct = form.target_revenue ? Math.min(Math.round((50000 / Number(form.target_revenue)) * 100), 100) : 0;

  return (
    <AppShell>
      <style>{CSS}</style>

      {/* MESH BG */}
      <div className="st-mesh" aria-hidden="true">
        <div className="st-blob st-b1" />
        <div className="st-blob st-b2" />
        <div className="st-blob st-b3" />
      </div>

      <div className="st-page">

        {/* ── HERO ──────────────────────────────────────────── */}
        <header className="st-hero">
          <div className="st-hero-left">
            <div className="st-eyebrow">
              <span className="st-pulse" />
              619 Fitness · Performance Command
            </div>
            <h1 className="st-hero-title">Staff Targets</h1>
            <p className="st-hero-sub">
              Set, track, and optimise monthly performance targets for your entire team — powered by intelligent insights.
            </p>
          </div>
          <div className="st-hero-right">
            <div className="st-month-selector">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="st-month-input"
                aria-label="Select month"
              />
            </div>
            <button className="st-cta" onClick={openModal}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Set Target
              <span className="st-cta-glow" />
            </button>
          </div>
        </header>

        {/* ── ALERTS ──────────────────────────────────────── */}
        {error   && <div className="st-alert st-alert-e"><span>⚠</span>{error}<button onClick={() => setError('')}>✕</button></div>}
        {success && <div className="st-alert st-alert-s"><span>✓</span>{success}</div>}

        {/* ── KPI CARDS ─────────────────────────────────── */}
        <div className="st-kpis">
          {[
            {
              label: 'Total Revenue Target',
              value: loading ? '—' : fmt(totalRevTarget),
              sub: loading ? '' : `${fmt(totalRevAchieved)} achieved`,
              icon: '💰',
              grad: ['#7c3aed','#4f46e5'],
              pctVal: overallPct,
            },
            {
              label: 'Achievement Rate',
              value: loading ? '—' : `${overallPct}%`,
              sub: 'Overall team performance',
              icon: '📊',
              grad: overallPct >= 80 ? ['#10b981','#059669'] : overallPct >= 50 ? ['#f59e0b','#d97706'] : ['#e11d48','#be185d'],
              pctVal: overallPct,
            },
            {
              label: 'Active Targets',
              value: loading ? '—' : String(activeTargets),
              sub: `${achieved100} fully achieved`,
              icon: '🎯',
              grad: ['#0ea5e9','#2563eb'],
              pctVal: activeTargets > 0 ? Math.round((achieved100/activeTargets)*100) : 0,
            },
            {
              label: 'Client Targets',
              value: loading ? '—' : String(totalCliTarget),
              sub: `${totalCliAchieved} clients acquired`,
              icon: '👥',
              grad: ['#06b6d4','#0891b2'],
              pctVal: pct(totalCliAchieved, totalCliTarget),
            },
            {
              label: 'Top Performer',
              value: loading ? '—' : (bestPerformer ? bestPerformer.staff_name || '—' : 'No data'),
              sub: bestPerformer ? `${fmt(bestPerformer.achieved_revenue || 0)} revenue` : 'Set targets to see',
              icon: '🏆',
              grad: ['#f59e0b','#d97706'],
              pctVal: bestPerformer ? pct(bestPerformer.achieved_revenue, bestPerformer.target_revenue) : 0,
            },
            {
              label: 'Team Score',
              value: loading ? '—' : `${Math.round((overallPct * 0.6) + (pct(totalCliAchieved, totalCliTarget) * 0.4))}`,
              sub: 'Composite performance index',
              icon: '⚡',
              grad: ['#8b5cf6','#6d28d9'],
              pctVal: Math.round((overallPct * 0.6) + (pct(totalCliAchieved, totalCliTarget) * 0.4)),
            },
          ].map((k, i) => (
            <div key={k.label} className="st-kpi" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="st-kpi-icon" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})` }}>{k.icon}</div>
              <div className="st-kpi-body">
                <div className="st-kpi-label">{k.label}</div>
                <div className="st-kpi-value" style={{ background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {k.value}
                </div>
                <div className="st-kpi-sub">{k.sub}</div>
              </div>
              <div className="st-kpi-ring">
                <Ring pct={k.pctVal} size={52} stroke={5} color={k.grad[0]} />
                <span className="st-kpi-ring-pct" style={{ color: k.grad[0] }}>{k.pctVal}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN AREA ─────────────────────────────────── */}
        {loading ? (
          <SkeletonCards />
        ) : targets.length === 0 ? (
          <EmptyState onSet={openModal} />
        ) : (
          <div className="st-main">

            {/* LEFT: staff cards */}
            <div className="st-cards-col">
              <div className="st-section-head">
                <h2 className="st-section-title">Individual Performance</h2>
                <span className="st-section-badge">{monthLabel(month)}</span>
              </div>
              <div className="st-cards">
                {sorted.map((t, i) => {
                  const revPct = pct(t.achieved_revenue, t.target_revenue);
                  const cliPct = pct(t.achieved_clients, t.target_clients);
                  const badge  = perfBadge(revPct);
                  const ring1Color = revPct >= 100 ? '#10b981' : revPct >= 70 ? '#7c3aed' : revPct >= 40 ? '#f59e0b' : '#e11d48';
                  const insight = aiInsight(revPct);
                  return (
                    <div key={t.id} className="st-card" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="st-card-top">
                        <div className="st-card-avatar" style={{ background: avatarGrad(t.staff_name || '') }}>
                          {initials(t.staff_name || '?')}
                          {i === 0 && <span className="st-crown">👑</span>}
                        </div>
                        <div className="st-card-info">
                          <div className="st-card-name">{t.staff_name || 'Staff'}</div>
                          <div className="st-card-role">{t.role || 'Team Member'}</div>
                          <div className="st-card-badge" style={{ background: badge.bg, color: badge.color, boxShadow: `0 0 12px ${badge.glow}` }}>
                            {badge.label}
                          </div>
                        </div>
                        <div className="st-card-ring">
                          <Ring pct={revPct} size={72} stroke={6} color={ring1Color} />
                          <span className="st-card-ring-val" style={{ color: ring1Color }}>{revPct}%</span>
                        </div>
                      </div>

                      <div className="st-card-metrics">
                        <div className="st-metric">
                          <div className="st-metric-head">
                            <span className="st-metric-label">💰 Revenue</span>
                            <span className="st-metric-vals">{fmt(t.achieved_revenue)} <span className="st-metric-of">/ {fmt(t.target_revenue)}</span></span>
                          </div>
                          <div className="st-bar-bg">
                            <div className="st-bar-fill" style={{ width: `${revPct}%`, background: `linear-gradient(90deg,${ring1Color},${ring1Color}cc)` }} />
                          </div>
                        </div>
                        <div className="st-metric">
                          <div className="st-metric-head">
                            <span className="st-metric-label">👥 Clients</span>
                            <span className="st-metric-vals">{t.achieved_clients} <span className="st-metric-of">/ {t.target_clients}</span></span>
                          </div>
                          <div className="st-bar-bg">
                            <div className="st-bar-fill" style={{ width: `${cliPct}%`, background: 'linear-gradient(90deg,#0ea5e9,#2563eb)' }} />
                          </div>
                        </div>
                      </div>

                      <div className="st-ai-insight">
                        <span className="st-ai-dot">✦</span>
                        <span>{insight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: leaderboard */}
            <div className="st-right-col">
              <div className="st-leader-card">
                <div className="st-section-head">
                  <h2 className="st-section-title">Leaderboard</h2>
                  <div className="st-leader-tabs">
                    <button className={`st-tab${leaderSort==='revenue'?' active':''}`} onClick={() => setLeaderSort('revenue')}>Revenue</button>
                    <button className={`st-tab${leaderSort==='clients'?' active':''}`} onClick={() => setLeaderSort('clients')}>Clients</button>
                  </div>
                </div>
                <div className="st-leader-list">
                  {sorted.map((t, i) => {
                    const val = leaderSort === 'revenue' ? fmt(t.achieved_revenue||0) : `${t.achieved_clients||0} clients`;
                    const p2  = leaderSort === 'revenue' ? pct(t.achieved_revenue, t.target_revenue) : pct(t.achieved_clients, t.target_clients);
                    const medals = ['🥇','🥈','🥉'];
                    return (
                      <div key={t.id} className="st-leader-row">
                        <span className="st-rank">{medals[i] || `#${i+1}`}</span>
                        <div className="st-leader-av" style={{ background: avatarGrad(t.staff_name||'') }}>{initials(t.staff_name||'?')}</div>
                        <div className="st-leader-info">
                          <div className="st-leader-name">{t.staff_name || 'Staff'}</div>
                          <div className="st-leader-bar-bg">
                            <div className="st-leader-bar-fill" style={{ width: `${p2}%` }} />
                          </div>
                        </div>
                        <div className="st-leader-val">{val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly summary */}
              <div className="st-summary-card">
                <div className="st-section-title" style={{ marginBottom: 16 }}>Month Summary</div>
                {[
                  { label: 'Revenue Progress',  val: `${overallPct}%`,                       color: '#7c3aed' },
                  { label: 'Clients Progress',   val: `${pct(totalCliAchieved,totalCliTarget)}%`, color: '#0ea5e9' },
                  { label: 'Targets Completed',  val: `${achieved100} / ${activeTargets}`,  color: '#10b981' },
                  { label: 'Total Achieved Rev', val: fmt(totalRevAchieved),                  color: '#f59e0b' },
                ].map(row => (
                  <div key={row.label} className="st-summary-row">
                    <span className="st-summary-label">{row.label}</span>
                    <span className="st-summary-val" style={{ color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══ SET TARGET MODAL ══════════════════════════════ */}
      {modal && (
        <>
          <div className="st-backdrop" onClick={() => setModal(false)} aria-hidden="true" />
          <div className="st-modal" role="dialog" aria-modal="true" aria-label="Set Monthly Performance Targets">

            {/* Modal glow orbs */}
            <div className="st-modal-orb st-mo1" aria-hidden="true" />
            <div className="st-modal-orb st-mo2" aria-hidden="true" />

            {/* Header */}
            <div className="st-modal-header">
              <div className="st-modal-icon">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <div>
                <h2 className="st-modal-title">Set Monthly Performance Targets</h2>
                <p className="st-modal-sub">Define ambitious, data-driven goals for your team • {monthLabel(month)}</p>
              </div>
              <button className="st-modal-close" onClick={() => setModal(false)} aria-label="Close">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {error && <div className="st-alert st-alert-e" style={{ margin: '0 28px' }}><span>⚠</span>{error}</div>}

            <form onSubmit={submitTarget} className="st-modal-form">

              {/* Staff selector */}
              <div className="st-field">
                <label className="st-label">
                  <span className="st-label-icon">👤</span>
                  Staff Member
                  <span className="st-label-req">*</span>
                </label>
                <div className="st-select-wrap">
                  <select
                    className="st-select"
                    value={form.staff_id}
                    onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Choose a team member…</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                    ))}
                  </select>
                  <svg className="st-select-arrow" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              <div className="st-field-row">
                {/* Revenue target */}
                <div className="st-field">
                  <label className="st-label">
                    <span className="st-label-icon">💰</span>
                    Revenue Target (₹)
                  </label>
                  <div className="st-input-wrap">
                    <span className="st-input-prefix">₹</span>
                    <input
                      type="number"
                      min="0"
                      className="st-input st-input-prefixed"
                      placeholder="e.g. 150000"
                      value={form.target_revenue}
                      onChange={e => setForm(p => ({ ...p, target_revenue: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Client target */}
                <div className="st-field">
                  <label className="st-label">
                    <span className="st-label-icon">👥</span>
                    Client Target
                  </label>
                  <div className="st-input-wrap">
                    <span className="st-input-prefix">🎯</span>
                    <input
                      type="number"
                      min="0"
                      className="st-input st-input-prefixed"
                      placeholder="e.g. 12"
                      value={form.target_clients}
                      onChange={e => setForm(p => ({ ...p, target_clients: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Sessions target */}
              <div className="st-field">
                <label className="st-label">
                  <span className="st-label-icon">⚡</span>
                  Sessions Target
                  <span className="st-label-opt">(optional)</span>
                </label>
                <div className="st-input-wrap">
                  <span className="st-input-prefix">📅</span>
                  <input
                    type="number"
                    min="0"
                    className="st-input st-input-prefixed"
                    placeholder="e.g. 80"
                    value={form.target_sessions}
                    onChange={e => setForm(p => ({ ...p, target_sessions: e.target.value }))}
                  />
                </div>
              </div>

              {/* AI preview panel */}
              {(form.target_revenue || form.target_clients) && (
                <div className="st-preview">
                  <div className="st-preview-head">
                    <span className="st-ai-dot">✦</span>
                    AI Performance Prediction
                  </div>
                  <div className="st-preview-body">
                    <div className="st-preview-meter">
                      <div className="st-preview-bar-bg">
                        <div className="st-preview-bar-fill" style={{ width: `${Math.min(82, 50 + (Number(form.target_revenue)||0) / 10000)}%` }} />
                      </div>
                      <span className="st-preview-pct">82%</span>
                    </div>
                    <p className="st-preview-text">
                      Based on team historical performance, this target has an estimated
                      <strong style={{ color: '#7c3aed' }}> 82% success probability</strong>.
                      {Number(form.target_revenue) > 200000 && ' Consider a stretch incentive to push for 100%.'}
                    </p>
                    {form.target_revenue && (
                      <div className="st-preview-chips">
                        <span className="st-chip">📈 Suggested: {fmt(Math.round(Number(form.target_revenue) * 1.15))} stretch goal</span>
                        <span className="st-chip">🗓 Daily target: {fmt(Math.round(Number(form.target_revenue) / 26))}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button type="submit" className={`st-submit${submitting ? ' busy' : ''}`} disabled={submitting}>
                {submitting ? (
                  <><span className="st-spinner" />Setting target…</>
                ) : (
                  <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Set Performance Target</>
                )}
                <span className="st-submit-glow" />
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <div className="st-cards" style={{ marginTop: 24 }}>
      {[1,2,3].map(i => (
        <div key={i} className="st-card" style={{ gap: 16 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div className="sk" style={{ width:56, height:56, borderRadius:'50%' }} />
            <div style={{ flex:1 }}>
              <div className="sk" style={{ height:14, width:'50%', borderRadius:6, marginBottom:8 }} />
              <div className="sk" style={{ height:10, width:'30%', borderRadius:6 }} />
            </div>
          </div>
          <div className="sk" style={{ height:8, borderRadius:99 }} />
          <div className="sk" style={{ height:8, width:'80%', borderRadius:99 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */
function EmptyState({ onSet }: { onSet: () => void }) {
  return (
    <div className="st-empty">
      <div className="st-empty-orb" aria-hidden="true" />
      <div className="st-empty-icon">🎯</div>
      <h2 className="st-empty-title">No Targets Set Yet</h2>
      <p className="st-empty-sub">
        Define performance targets for your team and unlock a powerful analytics dashboard that tracks revenue, clients, and sessions in real time.
      </p>
      <div className="st-empty-features">
        {['📊 Revenue tracking','👥 Client analytics','⚡ Session metrics','🏆 Team leaderboard'].map(f => (
          <span key={f} className="st-empty-chip">{f}</span>
        ))}
      </div>
      <button className="st-cta" onClick={onSet} style={{ marginTop: 28 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Set First Target
        <span className="st-cta-glow" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════ */
const CSS = `
/* ── Reset / base ──────────────────────────────────── */
* { box-sizing: border-box; }

/* ── Mesh background ────────────────────────────────── */
.st-mesh {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
.st-blob {
  position: absolute; border-radius: 50%;
  filter: blur(90px); opacity: 0.22;
  animation: st-float 14s ease-in-out infinite;
}
.st-b1 { width:620px; height:620px; top:-160px; right:-100px;
  background: radial-gradient(circle,#7c3aed55,#4f46e533);
  animation-delay:0s; }
.st-b2 { width:480px; height:480px; bottom:0; left:-80px;
  background: radial-gradient(circle,#0ea5e944,#06b6d422);
  animation-delay:5s; }
.st-b3 { width:320px; height:320px; top:35%; left:38%;
  background: radial-gradient(circle,#10b98122,#f59e0b11);
  animation-delay:9s; }
@keyframes st-float {
  0%,100%{ transform:translate(0,0) scale(1); }
  33%{ transform:translate(20px,-24px) scale(1.04); }
  66%{ transform:translate(-14px,16px) scale(0.96); }
}

/* ── Page wrap ──────────────────────────────────────── */
.st-page {
  position: relative; z-index: 1;
  max-width: 1380px; margin: 0 auto;
  padding: 36px 36px 120px;
  min-height: 100vh;
}
@media (max-width: 768px) { .st-page { padding: 20px 16px 80px; } }

/* ── Hero ───────────────────────────────────────────── */
.st-hero {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; margin-bottom: 32px;
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(124,58,237,0.14);
  border-radius: 24px; padding: 32px 36px;
  box-shadow: 0 4px 32px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.04);
}
@media (max-width: 700px) { .st-hero { flex-direction: column; align-items: flex-start; } }
.st-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em;
  text-transform: uppercase; color: #7c3aed;
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18);
  border-radius: 100px; padding: 4px 13px; margin-bottom: 12px;
}
.st-pulse {
  width: 7px; height: 7px; border-radius: 50%; background: #7c3aed;
  animation: st-pulse 2s ease-in-out infinite;
}
@keyframes st-pulse {
  0%,100%{ box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
  50%{ box-shadow: 0 0 0 6px transparent; }
}
.st-hero-title {
  font-size: clamp(28px,3.5vw,44px); font-weight: 900;
  letter-spacing: -0.045em; line-height: 1.1;
  background: linear-gradient(135deg,#0f172a 0%,#4f46e5 55%,#7c3aed 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.st-hero-sub {
  font-size: 13.5px; color: #64748b; margin-top: 10px;
  max-width: 460px; line-height: 1.6;
}
.st-hero-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

/* ── Month selector ─────────────────────────────────── */
.st-month-selector {
  display: flex; align-items: center; gap: 9px;
  background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
  border: 1.5px solid rgba(124,58,237,0.2);
  border-radius: 14px; padding: 10px 16px;
  color: #64748b;
  box-shadow: 0 2px 12px rgba(124,58,237,0.08);
}
.st-month-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; font-weight: 700; color: #0f172a;
  cursor: pointer;
}

/* ── CTA button ─────────────────────────────────────── */
.st-cta {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 100px; border: none;
  background: linear-gradient(135deg,#7c3aed,#4f46e5);
  color: #fff; font-size: 14px; font-weight: 800;
  cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 20px rgba(124,58,237,0.35);
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.st-cta:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 36px rgba(124,58,237,0.45);
}
.st-cta-glow {
  position: absolute; inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0.18),transparent);
  border-radius: inherit; pointer-events: none;
}

/* ── Alerts ─────────────────────────────────────────── */
.st-alert {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 500; margin-bottom: 18px;
  animation: st-slide 0.25s ease;
}
@keyframes st-slide { from{ opacity:0; transform:translateY(-6px); } to{ opacity:1; transform:none; } }
.st-alert-e { background:#fff1f2; color:#9f1239; border:1px solid #fecdd3; }
.st-alert-s { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; }
.st-alert button { margin-left:auto; background:none; border:none; cursor:pointer; opacity:0.6; }

/* ── KPI grid ───────────────────────────────────────── */
.st-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px; margin-bottom: 32px;
}
@media (max-width: 600px) { .st-kpis { grid-template-columns: 1fr 1fr; } }

.st-kpi {
  position: relative;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.9);
  border-radius: 20px; padding: 20px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s;
  animation: st-card-in 0.4s ease both;
  overflow: hidden;
}
.st-kpi::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0.3),transparent);
  border-radius: inherit; pointer-events: none;
}
.st-kpi:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.1);
}
@keyframes st-card-in {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
.st-kpi-icon {
  width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.st-kpi-body { flex: 1; min-width: 0; }
.st-kpi-label  { font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; }
.st-kpi-value  { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; margin: 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-kpi-sub    { font-size: 10.5px; color: #94a3b8; }
.st-kpi-ring   { position: relative; flex-shrink: 0; }
.st-kpi-ring-pct {
  position: absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size: 9.5px; font-weight: 900;
}

/* ── Main 2-col layout ──────────────────────────────── */
.st-main {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 1100px) { .st-main { grid-template-columns: 1fr; } }

/* ── Section heading ────────────────────────────────── */
.st-section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.st-section-title {
  font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;
}
.st-section-badge {
  font-size: 10.5px; font-weight: 700;
  background: rgba(124,58,237,0.08); color: #7c3aed;
  border: 1px solid rgba(124,58,237,0.18);
  padding: 3px 11px; border-radius: 100px;
}

/* ── Staff performance cards ────────────────────────── */
.st-cards { display: flex; flex-direction: column; gap: 16px; }
.st-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(18px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.95);
  border-radius: 22px; padding: 22px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s;
  animation: st-card-in 0.4s ease both;
  display: flex; flex-direction: column; gap: 16px;
}
.st-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.1);
}

.st-card-top { display: flex; align-items: flex-start; gap: 14px; }
.st-card-avatar {
  position: relative;
  width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px; font-weight: 900;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
}
.st-crown {
  position: absolute; top: -8px; right: -4px;
  font-size: 14px;
}
.st-card-info { flex: 1; }
.st-card-name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.st-card-role { font-size: 11.5px; color: #94a3b8; margin-top: 2px; text-transform: capitalize; }
.st-card-badge {
  display: inline-flex; align-items: center;
  margin-top: 7px; padding: 4px 11px; border-radius: 100px;
  font-size: 11px; font-weight: 800;
}
.st-card-ring { position: relative; flex-shrink: 0; }
.st-card-ring-val {
  position: absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  font-size: 12px; font-weight: 900;
}

/* Metrics */
.st-card-metrics { display: flex; flex-direction: column; gap: 12px; }
.st-metric {}
.st-metric-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 7px;
}
.st-metric-label { font-size: 12px; font-weight: 700; color: #475569; }
.st-metric-vals  { font-size: 12.5px; font-weight: 800; color: #0f172a; }
.st-metric-of    { font-weight: 500; color: #94a3b8; }
.st-bar-bg { height: 7px; background: rgba(0,0,0,0.06); border-radius: 99px; overflow: hidden; }
.st-bar-fill {
  height: 100%; border-radius: 99px;
  transition: width 1.2s cubic-bezier(0.34,1.56,0.64,1);
}

/* AI insight */
.st-ai-insight {
  display: flex; align-items: flex-start; gap: 8px;
  background: linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.04));
  border: 1px solid rgba(124,58,237,0.12);
  border-radius: 12px; padding: 11px 14px;
  font-size: 11.5px; color: #4c1d95; line-height: 1.5;
}
.st-ai-dot {
  font-size: 14px; flex-shrink: 0; margin-top: 0px;
  background: linear-gradient(135deg,#7c3aed,#4f46e5);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Right column ───────────────────────────────────── */
.st-right-col { display: flex; flex-direction: column; gap: 20px; }

/* Leaderboard */
.st-leader-card, .st-summary-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,0.95);
  border-radius: 22px; padding: 22px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
}
.st-leader-tabs { display: flex; gap: 4px; background: #f8fafc; border-radius: 9px; padding: 3px; }
.st-tab {
  padding: 5px 12px; border: none; background: none;
  border-radius: 7px; font-size: 12px; font-weight: 700;
  color: #94a3b8; cursor: pointer; transition: all 0.14s;
}
.st-tab.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.st-leader-list { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.st-leader-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 12px;
  transition: background 0.14s;
}
.st-leader-row:hover { background: rgba(124,58,237,0.04); }
.st-rank { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
.st-leader-av {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 800;
}
.st-leader-info { flex: 1; min-width: 0; }
.st-leader-name { font-size: 12.5px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-leader-bar-bg { height: 4px; background: rgba(0,0,0,0.06); border-radius: 99px; margin-top: 5px; overflow: hidden; }
.st-leader-bar-fill {
  height: 100%;
  background: linear-gradient(90deg,#7c3aed,#4f46e5);
  border-radius: 99px;
  transition: width 1s ease;
}
.st-leader-val { font-size: 12px; font-weight: 800; color: #7c3aed; flex-shrink: 0; }

/* Summary card */
.st-summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #f8fafc;
  font-size: 12.5px;
}
.st-summary-row:last-child { border-bottom: none; }
.st-summary-label { color: #64748b; font-weight: 500; }
.st-summary-val   { font-weight: 800; }

/* ── Empty state ────────────────────────────────────── */
.st-empty {
  position: relative; overflow: hidden;
  text-align: center;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(124,58,237,0.1);
  border-radius: 28px;
  padding: 80px 48px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.05);
}
.st-empty-orb {
  position: absolute; width: 400px; height: 400px;
  top: -100px; left: 50%; transform: translateX(-50%);
  background: radial-gradient(circle,rgba(124,58,237,0.12),transparent 70%);
  pointer-events: none;
}
.st-empty-icon {
  font-size: 64px; margin-bottom: 16px;
  animation: st-empty-float 3s ease-in-out infinite;
}
@keyframes st-empty-float {
  0%,100%{ transform:translateY(0) scale(1); }
  50%{ transform:translateY(-10px) scale(1.05); }
}
.st-empty-title {
  font-size: 26px; font-weight: 900; color: #0f172a;
  letter-spacing: -0.04em; margin-bottom: 12px;
  background: linear-gradient(135deg,#0f172a,#7c3aed);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.st-empty-sub {
  font-size: 14px; color: #64748b; max-width: 420px;
  margin: 0 auto; line-height: 1.7;
}
.st-empty-features {
  display: flex; flex-wrap: wrap; gap: 8px;
  justify-content: center; margin-top: 24px;
}
.st-empty-chip {
  background: rgba(124,58,237,0.08); color: #7c3aed;
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 100px; padding: 6px 14px;
  font-size: 12.5px; font-weight: 700;
}

/* ── Modal ──────────────────────────────────────────── */
.st-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(10,10,20,0.6);
  backdrop-filter: blur(12px);
  animation: st-fade 0.22s ease;
}
@keyframes st-fade { from{ opacity:0; } to{ opacity:1; } }

.st-modal {
  position: fixed;
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  z-index: 60;
  width: min(600px, calc(100vw - 32px));
  max-height: 92vh; overflow-y: auto;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(40px) saturate(1.6);
  border: 1px solid rgba(255,255,255,0.9);
  border-radius: 28px;
  box-shadow: 0 32px 80px rgba(10,10,20,0.25), 0 0 0 1px rgba(124,58,237,0.1);
  animation: st-modal-in 0.32s cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
}
@keyframes st-modal-in {
  from{ opacity:0; transform:translate(-50%,-46%) scale(0.95); }
  to  { opacity:1; transform:translate(-50%,-50%) scale(1); }
}
.st-modal-orb {
  position: absolute; border-radius: 50%;
  pointer-events: none; filter: blur(60px); opacity: 0.5;
}
.st-mo1 { width:300px; height:300px; top:-80px; right:-60px;
  background: radial-gradient(circle,#7c3aed33,transparent); }
.st-mo2 { width:200px; height:200px; bottom:-60px; left:-40px;
  background: radial-gradient(circle,#4f46e522,transparent); }

.st-modal-header {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 28px 28px 24px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  position: relative; z-index: 1;
}
.st-modal-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg,#7c3aed,#4f46e5);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px rgba(124,58,237,0.3);
}
.st-modal-title {
  font-size: 18px; font-weight: 900; color: #0f172a;
  letter-spacing: -0.03em; margin-bottom: 4px;
}
.st-modal-sub { font-size: 12.5px; color: #64748b; line-height: 1.5; }
.st-modal-close {
  margin-left: auto; flex-shrink: 0;
  width: 34px; height: 34px; border-radius: 10px;
  background: #f8fafc; border: 1.5px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: all 0.14s;
}
.st-modal-close:hover { background: #fee2e2; border-color: #fecdd3; color: #e11d48; }

.st-modal-form {
  padding: 24px 28px 28px;
  display: flex; flex-direction: column; gap: 20px;
  position: relative; z-index: 1;
}

/* Fields */
.st-field { display: flex; flex-direction: column; gap: 8px; }
.st-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 800; color: #334155;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.st-label-icon { font-size: 14px; }
.st-label-req { color: #e11d48; font-size: 14px; }
.st-label-opt { font-size: 10.5px; color: #94a3b8; font-weight: 600; text-transform: none; letter-spacing: 0; }

.st-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 500px) { .st-field-row { grid-template-columns: 1fr; } }

.st-select-wrap { position: relative; }
.st-select {
  width: 100%;
  background: rgba(248,250,252,0.9);
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 40px 14px 16px;
  font-size: 13.5px; font-weight: 600; color: #0f172a;
  outline: none; cursor: pointer; appearance: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.st-select:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 4px rgba(124,58,237,0.1);
  background: #fff;
}
.st-select-arrow {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  color: #94a3b8; pointer-events: none;
}

.st-input-wrap { position: relative; }
.st-input-prefix {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 15px; pointer-events: none; z-index: 1;
}
.st-input {
  width: 100%;
  background: rgba(248,250,252,0.9);
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 14px; font-weight: 600; color: #0f172a;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.st-input-prefixed { padding-left: 42px; }
.st-input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 4px rgba(124,58,237,0.1);
  background: #fff;
}
.st-input::placeholder { color: #cbd5e1; font-weight: 400; }

/* AI preview */
.st-preview {
  background: linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.04));
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 16px; padding: 16px 18px;
  animation: st-slide 0.22s ease;
}
.st-preview-head {
  display: flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 800; color: #7c3aed;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.st-preview-body {}
.st-preview-meter {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.st-preview-bar-bg {
  flex: 1; height: 8px;
  background: rgba(124,58,237,0.1);
  border-radius: 99px; overflow: hidden;
}
.st-preview-bar-fill {
  height: 100%;
  background: linear-gradient(90deg,#7c3aed,#4f46e5);
  border-radius: 99px;
  transition: width 0.6s ease;
}
.st-preview-pct { font-size: 12px; font-weight: 900; color: #7c3aed; flex-shrink: 0; }
.st-preview-text { font-size: 12.5px; color: #4c1d95; line-height: 1.55; margin-bottom: 12px; }
.st-preview-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.st-chip {
  background: rgba(124,58,237,0.08); color: #7c3aed;
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 100px; padding: 4px 11px;
  font-size: 11.5px; font-weight: 700;
}

/* Submit */
.st-submit {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  width: 100%; padding: 16px;
  border: none; border-radius: 16px;
  background: linear-gradient(135deg,#7c3aed,#4f46e5);
  color: #fff; font-size: 15px; font-weight: 800;
  cursor: pointer; letter-spacing: -0.01em;
  box-shadow: 0 6px 24px rgba(124,58,237,0.35);
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.st-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(124,58,237,0.45);
}
.st-submit:disabled { opacity: 0.55; cursor: default; transform: none; }
.st-submit.busy { animation: st-submit-pulse 0.9s ease-in-out infinite; }
@keyframes st-submit-pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.7; } }
.st-submit-glow {
  position: absolute; inset: 0;
  background: linear-gradient(135deg,rgba(255,255,255,0.15),transparent);
  pointer-events: none;
}
.st-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  animation: st-spin 0.7s linear infinite; display: inline-block;
}
@keyframes st-spin { to{ transform:rotate(360deg); } }

/* ── Skeleton ───────────────────────────────────────── */
.sk {
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%;
  animation: st-shimmer 1.4s ease-in-out infinite;
}
@keyframes st-shimmer { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
`;
