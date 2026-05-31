'use client';
import { useEffect, useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Zap, Plus, RefreshCw, Search, TrendingUp, Users, DollarSign, AlertTriangle, Edit2, Trash2, X, CheckCircle, Star, Layers, CreditCard, CalendarDays, ArrowUpRight } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';
import { StoredPlan, PlanKind, PlanDuration, DURATIONS, DEFAULT_PLANS, PLANS_KEY, getStoredPlans, savePlans } from '@/lib/plans';
import { DonutChart } from '@/components/ui/DonutChart';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const GRADIENTS = {
  membership: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  pt: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  active: 'linear-gradient(135deg, #10b981, #059669)',
  expired: 'linear-gradient(135deg, #6b7280, #9ca3af)',
  revenue: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
};

const PLAN_COLORS = [
  { gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', accent: '#6366f1', glow: 'rgba(99,102,241,0.3)' },
  { gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  { gradient: 'linear-gradient(135deg, #ef4444, #f87171)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', accent: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
  { gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.25)', accent: '#06b6d4', glow: 'rgba(6,182,212,0.3)' },
  { gradient: 'linear-gradient(135deg, #10b981, #34d399)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', accent: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  { gradient: 'linear-gradient(135deg, #ec4899, #f472b6)', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)', accent: '#ec4899', glow: 'rgba(236,72,153,0.3)' },
  { gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.25)', accent: '#14b8a6', glow: 'rgba(20,184,166,0.3)' },
];

function blankPlan(kind: PlanKind = 'Membership'): StoredPlan {
  return {
    id: 'p-' + Date.now(), kind, name: '', duration: 'Monthly',
    base_amount: 0, discount: 0, final_amount: 0,
    sessions_per_week: kind === 'PT' ? 3 : undefined,
    features: [], popular: false,
  };
}

export default function SubscriptionsPage() {
  return (
    <Guard role="admin"><SubscriptionsContent /></Guard>
  );
}

function SubscriptionsContent() {
  const [mainTab, setMainTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [planTab, setPlanTab] = useState<'all' | 'Membership' | 'PT'>('all');
  const [editing, setEditing] = useState<StoredPlan | null>(null);
  const [creating, setCreating] = useState<PlanKind | null>(null);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    api.clients.list({ limit: 1000 })
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    setPlans(getStoredPlans());
  }, []);

  useEffect(() => {
    if (plans.length > 0) savePlans(plans);
  }, [plans]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  }

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return clients
      .filter((c) => c.package_type || c.pt_start_date || c.pt_end_date)
      .filter((c) => !q || c.name.toLowerCase().includes(q) ||
        (c.client_id || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(search));
  }, [clients, search]);

  const activeSubs = rows.filter((c) => c.status === 'active');
  const expiringSoon = rows.filter((c) => {
    if (!c.pt_end_date) return false;
    const days = (new Date(c.pt_end_date).getTime() - Date.now()) / 86400000;
    return days > 0 && days <= 7;
  });
  const totalRevenue = rows.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
  const totalBalance = rows.reduce((s, c) => s + Number(c.balance_amount || 0), 0);

  const visiblePlans = planTab === 'all' ? plans : plans.filter((p) => p.kind === planTab);
  const memCount = plans.filter((p) => p.kind === 'Membership').length;
  const ptCount = plans.filter((p) => p.kind === 'PT').length;

  const planDonutData = [
    { name: 'Membership Plans', value: memCount, color: '#6366f1' },
    { name: 'PT Plans', value: ptCount, color: '#f59e0b' },
  ];

  const statusDonutData = [
    { name: 'Active', value: activeSubs.length, color: '#10b981' },
    { name: 'Other', value: rows.length - activeSubs.length, color: '#6b7280' },
  ];

  function deletePlan(id: string) {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    showFlash('Plan deleted');
  }

  function generateSet(kind: PlanKind) {
    const label = kind === 'Membership' ? 'Gym Membership' : 'Personal Training';
    if (!confirm(`Generate default ${label} plans? Existing ${kind} plans will be replaced.`)) return;
    setPlans((prev) => [...prev.filter((p) => p.kind !== kind), ...DEFAULT_PLANS.filter((p) => p.kind === kind)]);
    showFlash(`${label} plans generated`);
  }

  function resetAll() {
    if (!confirm('Reset ALL plans to defaults? All custom plans will be lost.')) return;
    setPlans(DEFAULT_PLANS);
    savePlans(DEFAULT_PLANS);
    showFlash('All plans reset to defaults');
  }

  const pills = (['all', 'Membership', 'PT'] as const).map((t) => ({
    key: t, label: t === 'all' ? `All (${plans.length})` : t === 'Membership' ? `Membership (${memCount})` : `PT (${ptCount})`, icon: t === 'Membership' ? '🏋️' : t === 'PT' ? '💪' : '📋',
  }));

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        {/* ── Hero Header ── */}
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={16} color="#fff" />
              </div>
              <div>
                <h1 className="page-title" style={{ margin: 0 }}>Memberships</h1>
                <p className="page-subtitle" style={{ margin: 0 }}>Manage subscriptions & plans</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={resetAll}>
              <RefreshCw size={14} /> Reset
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreating('Membership')}>
              <Plus size={14} /> New Plan
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          {(['subscriptions', 'plans'] as const).map((t) => (
            <button key={t} className={`tab-btn ${mainTab === t ? 'active' : ''}`} onClick={() => setMainTab(t)}>
              {t === 'subscriptions' ? <Users size={14} /> : <Layers size={14} />}
              <span style={{ marginLeft: 6 }}>{t === 'subscriptions' ? 'Subscriptions' : 'Plans & Pricing'}</span>
            </button>
          ))}
        </div>
          {flash && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} /> {flash}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} /> {error}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════
              SUBSCRIPTIONS TAB
          ════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {mainTab === 'subscriptions' && (
              <motion.div key="subscriptions" variants={containerVariants} initial="hidden" animate="visible">
                {/* Stats grid with donuts */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="subs-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <StatCard icon={<Users size={16} />} label="Active Subscriptions" value={activeSubs.length} gradient={GRADIENTS.active} />
                  <StatCard icon={<AlertTriangle size={16} />} label="Expiring in 7 Days" value={expiringSoon.length} gradient={GRADIENTS.expired} />
                  <StatCard icon={<DollarSign size={16} />} label="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} gradient={GRADIENTS.revenue} />
                  <StatCard icon={<TrendingUp size={16} />} label="Outstanding Balance" value={`₹${totalBalance.toLocaleString('en-IN')}`} gradient={GRADIENTS.membership} />
                </motion.div>

                {/* Donut row */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="subs-donuts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <DonutWrap title="Subscription Status" subtitle="Active vs other members">
                    <DonutChart data={statusDonutData} centerValue={rows.length} centerLabel="Total Members" height={200} thin />
                  </DonutWrap>
                  <DonutWrap title="Plan Distribution" subtitle="Membership vs PT plans">
                    <DonutChart data={planDonutData} centerValue={plans.length} centerLabel="Total Plans" height={200} thin />
                  </DonutWrap>
                  <DonutWrap title="Revenue Breakdown" subtitle="Paid vs outstanding">
                    <DonutChart data={[{ name: 'Paid', value: totalRevenue, color: '#10b981' }, { name: 'Outstanding', value: totalBalance, color: '#6366f1' }]} centerValue={`₹${(totalRevenue + totalBalance).toLocaleString('en-IN')}`} centerLabel="Total Value" height={200} thin />
                  </DonutWrap>
                </motion.div>

                {/* Search bar */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: 16 }}>
                  <div style={{ position: 'relative', maxWidth: 320 }} className="subs-search">
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      placeholder="Search member, code, or mobile..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: '1px solid rgba(226,232,240,0.8)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', fontSize: 13, fontWeight: 500, outline: 'none', transition: 'border-color 0.2s', color: '#1e293b' }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(226,232,240,0.8)'}
                    />
                  </div>
                </motion.div>

                {/* Table */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.8)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    {loading ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Loading subscriptions...</div>
                    ) : rows.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <Users size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                        <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No subscriptions found</div>
                        <div style={{ color: '#cbd5e1', fontSize: 12 }}>Try adjusting your search</div>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="subs-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                              {['Code', 'Member', 'Package', 'Start', 'End', 'Paid', 'Balance', 'Status', 'Actions'].map((h) => (
                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
                              {rows.map((c, i) => (
                                <motion.tr
                                  key={c.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ delay: i * 0.02, duration: 0.3 }}
                                  style={{ borderBottom: '1px solid rgba(226,232,240,0.4)', transition: 'background 0.15s' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                                >
                                  <td style={{ padding: '10px 14px' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{c.client_id || c.member_code || '-'}</span>
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <Link href={`/clients/${c.id}`} style={{ color: '#1e293b', fontWeight: 700, textDecoration: 'none', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {c.name}
                                      <ArrowUpRight size={11} style={{ color: '#94a3b8', opacity: 0 }} />
                                    </Link>
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: 6, background: c.package_type?.toLowerCase().includes('pt') ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.08)', color: c.package_type?.toLowerCase().includes('pt') ? '#d97706' : '#6366f1', fontWeight: 600, fontSize: 11 }}>{c.package_type || '-'}</span>
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(c.pt_start_date) || '-'}</td>
                                  <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(c.pt_end_date) || '-'}</td>
                                  <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(c.paid_amount)}</td>
                                  <td style={{ padding: '10px 14px', color: Number(c.balance_amount || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(c.balance_amount)}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <StatusBadge status={c.status || 'active'} />
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <div className="subs-table-actions" style={{ display: 'flex', gap: 4 }}>
                                      <Link href={`/clients/${c.id}/renew-subscription`} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(16,185,129,0.2)', transition: 'all 0.15s', whiteSpace: 'nowrap' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}>Renew</Link>
                                      <Link href={`/clients/${c.id}/upgrade`} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(99,102,241,0.15)', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)' }}>Upgrade</Link>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(226,232,240,0.4)', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                          {rows.length} subscription{rows.length !== 1 ? 's' : ''} · {activeSubs.length} active
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════
                PLANS TAB
            ════════════════════════════════════════════ */}
            {mainTab === 'plans' && (
              <motion.div key="plans" variants={containerVariants} initial="hidden" animate="visible">
                {/* Quick action cards */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="subs-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
                  <ActionCard
                    icon={<Package size={18} />}
                    title="Gym Membership Plans"
                    count={memCount}
                    gradient={GRADIENTS.membership}
                    glowColor="rgba(99,102,241,0.25)"
                    onGenerate={() => generateSet('Membership')}
                    onNew={() => setCreating('Membership')}
                  />
                  <ActionCard
                    icon={<Zap size={18} />}
                    title="Personal Training Plans"
                    count={ptCount}
                    gradient={GRADIENTS.pt}
                    glowColor="rgba(245,158,11,0.25)"
                    onGenerate={() => generateSet('PT')}
                    onNew={() => setCreating('PT')}
                  />
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Plan Breakdown</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{memCount} gym · {ptCount} PT</div>
                      </div>
                    </div>
                    <div style={{ height: 100 }}>
                      <DonutChart data={planDonutData} height={100} thin hideLegend />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Plan type filter pills */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="subs-pills" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {pills.map((p) => (
                    <motion.button
                      key={p.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPlanTab(p.key)}
                      style={{
                        padding: '7px 16px', borderRadius: 10, border: '1px solid',
                        cursor: 'pointer', fontWeight: 700, fontSize: 12,
                        background: planTab === p.key
                          ? (p.key === 'Membership' ? 'linear-gradient(135deg, #6366f1, #818cf8)' : p.key === 'PT' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'linear-gradient(135deg, #64748b, #94a3b8)')
                          : 'rgba(255,255,255,0.5)',
                        borderColor: planTab === p.key ? 'transparent' : 'rgba(226,232,240,0.8)',
                        color: planTab === p.key ? '#fff' : '#64748b',
                        backdropFilter: planTab === p.key ? 'none' : 'blur(8px)',
                        boxShadow: planTab === p.key ? `0 4px 12px ${p.key === 'Membership' ? 'rgba(99,102,241,0.3)' : p.key === 'PT' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.2)'}` : 'none',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span>{p.icon}</span> {p.label}
                    </motion.button>
                  ))}
                </motion.div>

                {/* Plan grid */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  {visiblePlans.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.7)', padding: '3rem', textAlign: 'center' }}>
                      <Layers size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No plans yet</div>
                      <div style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 16 }}>Generate a default set or create a custom plan</div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-primary btn-sm" onClick={() => generateSet('Membership')} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontWeight: 600 }}>Generate Gym Plans</motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-ghost btn-sm" onClick={() => generateSet('PT')}>Generate PT Plans</motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-ghost btn-sm" onClick={() => setCreating('Membership')}>+ Custom Plan</motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="subs-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                      <AnimatePresence>
                        {visiblePlans.map((p, i) => (
                          <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <PlanCard
                              plan={p}
                              colorSet={PLAN_COLORS[i % PLAN_COLORS.length]}
                              onEdit={() => setEditing(p)}
                              onDelete={() => deletePlan(p.id)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {/* Add plan tile */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCreating(planTab === 'PT' ? 'PT' : 'Membership')}
                        style={{
                          border: '2px dashed rgba(99,102,241,0.25)',
                          borderRadius: 18,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          minHeight: 220,
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.3)',
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.2s',
                          color: '#94a3b8',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.06)';
                          e.currentTarget.style.borderColor = '#6366f1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                        }}
                      >
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#6366f1' }}>+</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#64748b' }}>New Plan</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Create a custom plan</div>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* ── Create / Edit modal ── */}
      <AnimatePresence>
        {(editing || creating) && (
          <PlanModal
            initial={editing || blankPlan(creating || 'Membership')}
            onClose={() => { setEditing(null); setCreating(null); }}
            onSave={(p) => {
              if (editing) {
                setPlans((prev) => prev.map((x) => (x.id === p.id ? p : x)));
                showFlash('Plan updated');
              } else {
                setPlans((prev) => [...prev, p]);
                showFlash('Plan created');
              }
              setEditing(null);
              setCreating(null);
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string | number; gradient: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(15,23,42,0.1)' }}
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', padding: '18px 20px', transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Donut Wrap ── */
function DonutWrap({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Action Card ── */
function ActionCard({ icon, title, count, gradient, glowColor, onGenerate, onNew }: {
  icon: React.ReactNode; title: string; count: number; gradient: string; glowColor: string; onGenerate: () => void; onNew: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, boxShadow: `0 12px 40px ${glowColor}` }}
      style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.2s' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{count} plan{count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12, background: gradient, border: 'none', fontWeight: 600, boxShadow: `0 4px 12px ${glowColor}` }} onClick={onGenerate}>⚡ Generate Default Set</motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost btn-sm" style={{ fontSize: 12, fontWeight: 600 }} onClick={onNew}>+ New</motion.button>
      </div>
    </motion.div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Active' },
    expired: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Expired' },
    frozen: { bg: 'rgba(6,182,212,0.1)', color: '#0891b2', label: 'Frozen' },
    inactive: { bg: 'rgba(156,163,175,0.1)', color: '#6b7280', label: 'Inactive' },
  };
  const s = colors[status] || { bg: 'rgba(156,163,175,0.1)', color: '#6b7280', label: status };
  return (
    <span style={{ padding: '4px 12px', borderRadius: 8, background: s.bg, color: s.color, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {s.label}
    </span>
  );
}

/* ── Plan Card ── */
const CARD_GRADIENTS: Record<string, { bg: string; card: string; tag: string; tagColor: string; border: string }> = {
  Membership: { bg: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))', card: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))', tag: 'linear-gradient(135deg, #6366f1, #8b5cf6)', tagColor: '#fff', border: 'rgba(99,102,241,0.15)' },
  PT: { bg: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.03))', card: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))', tag: 'linear-gradient(135deg, #f59e0b, #ef4444)', tagColor: '#fff', border: 'rgba(245,158,11,0.15)' },
};

function PlanCard({ plan: p, colorSet, onEdit, onDelete }: { plan: StoredPlan; colorSet: typeof PLAN_COLORS[0]; onEdit: () => void; onDelete: () => void }) {
  const g = CARD_GRADIENTS[p.kind];
  return (
    <div style={{ background: g.card, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${g.border}`, overflow: 'hidden', position: 'relative', boxShadow: '0 4px 20px rgba(15,23,42,0.04)', display: 'flex', flexDirection: 'column', minHeight: 260, transition: 'all 0.25s' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 32px ${colorSet.glow}`;
        e.currentTarget.style.borderColor = colorSet.accent + '40';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.04)';
        e.currentTarget.style.borderColor = g.border;
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: colorSet.gradient }} />

      <div style={{ padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Kind + tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ padding: '3px 10px', borderRadius: 6, background: colorSet.bg, color: colorSet.accent, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {p.kind === 'Membership' ? '🏋️ Membership' : '💪 Personal Training'}
          </span>
          {p.popular && <span style={{ padding: '3px 10px', borderRadius: 6, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#fff', fontWeight: 800, fontSize: 10, boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>★ Popular</span>}
        </div>

        {/* Duration */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#94a3b8', marginBottom: 2 }}>{p.duration}</div>

        {/* Name */}
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 900, background: colorSet.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ₹{p.final_amount.toLocaleString('en-IN')}
          </span>
          {p.discount > 0 && (
            <>
              <span style={{ fontSize: 13, color: '#cbd5e1', textDecoration: 'line-through', fontWeight: 600 }}>₹{p.base_amount.toLocaleString('en-IN')}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 800, fontSize: 10 }}>Save ₹{p.discount.toLocaleString('en-IN')}</span>
            </>
          )}
        </div>

        {/* Sessions (PT) */}
        {p.kind === 'PT' && p.sessions_per_week && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#d97706', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, width: 'fit-content' }}>
            <CalendarDays size={11} /> {p.sessions_per_week} sessions / week
          </div>
        )}

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', flex: 1 }}>
          {p.features.slice(0, 5).map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              <CheckCircle size={12} color={colorSet.accent} />
              {f}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid rgba(226,232,240,0.5)', marginTop: 'auto' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, fontWeight: 700, color: colorSet.accent, background: colorSet.bg, border: `1px solid ${colorSet.border}` }} onClick={onEdit}>
            <Edit2 size={11} /> Edit
          </motion.button>
          <motion.button whileHover={{ scale: 1.02, background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }} whileTap={{ scale: 0.98 }} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '4px 10px', color: '#94a3b8' }} onClick={onDelete} aria-label="Delete">
            <Trash2 size={12} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── Plan Modal ── */
function PlanModal({ initial, onClose, onSave }: {
  initial: StoredPlan; onClose: () => void; onSave: (p: StoredPlan) => void;
}) {
  const [p, setP] = useState<StoredPlan>(initial);
  const [featuresText, setFeaturesText] = useState(initial.features.join('\n'));

  function set<K extends keyof StoredPlan>(k: K, v: StoredPlan[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  function recalc(base: number, disc: number) {
    setP((prev) => ({ ...prev, base_amount: base, discount: disc, final_amount: Math.max(0, base - disc) }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) { alert('Plan name is required'); return; }
    if (p.final_amount <= 0) { alert('Final amount must be greater than 0'); return; }
    onSave({ ...p, features: featuresText.split('\n').map((s) => s.trim()).filter(Boolean) });
  }

  const isNew = initial.id.startsWith('p-') && !initial.name;
  const isPT = p.kind === 'PT';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={submit}
        style={{
          maxWidth: 560, width: '100%', borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 24px 80px rgba(15,23,42,0.15)',
          padding: 28,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: isPT ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Package size={16} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{isNew ? 'Create Plan' : 'Edit Plan'}</span>
          </div>
          <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(226,232,240,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 16 }}><X size={15} /></motion.button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type + Duration row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Plan Type</label>
              <select className="input select" value={p.kind} onChange={(e) => set('kind', e.target.value as PlanKind)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}>
                <option value="Membership">🏋️ Gym Membership</option>
                <option value="PT">💪 Personal Training</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Duration</label>
              <select className="input select" value={p.duration} onChange={(e) => set('duration', e.target.value as PlanDuration)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}>
                {DURATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Plan Name *</label>
            <input className="input" required value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Quarterly Membership"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}
            />
          </div>

          {/* Sessions (PT only) */}
          {isPT && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Sessions per Week</label>
              <input className="input" type="number" min={1} max={7} value={p.sessions_per_week || 3} onChange={(e) => set('sessions_per_week', parseInt(e.target.value) || 3)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 13, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}
              />
            </div>
          )}

          {/* Pricing */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Pricing</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <input className="input" type="number" min={0} value={p.base_amount} onChange={(e) => recalc(parseFloat(e.target.value) || 0, p.discount)}
                  placeholder="Base"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}
                />
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>Base (₹)</div>
              </div>
              <div>
                <input className="input" type="number" min={0} value={p.discount} onChange={(e) => recalc(p.base_amount, parseFloat(e.target.value) || 0)}
                  placeholder="Discount"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 12, fontWeight: 600, background: '#fff', color: '#1e293b', outline: 'none' }}
                />
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>Discount (₹)</div>
              </div>
              <div>
                <input className="input" type="number" value={p.final_amount} readOnly
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #6366f1', fontSize: 12, fontWeight: 800, background: 'rgba(99,102,241,0.06)', color: '#6366f1', outline: 'none' }}
                />
                <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2, fontWeight: 700 }}>Final (₹)</div>
              </div>
            </div>
            {p.base_amount > 0 && p.discount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
                  {Math.round((p.discount / p.base_amount) * 100)}% off
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Customer saves ₹{p.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              Features <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(one per line)</span>
            </label>
            <textarea className="input" rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder={'Full gym access\nLocker facility\nFree diet consult'}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.8)', fontSize: 13, fontWeight: 500, background: '#fff', color: '#1e293b', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Popular toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#64748b', padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <input type="checkbox" checked={!!p.popular} onChange={(e) => set('popular', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#f59e0b' }} />
            <Star size={14} color="#f59e0b" />
            Mark as Most Popular
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" className="btn btn-primary" style={{ flex: 1, padding: '11px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            {isNew ? '+ Create Plan' : '✓ Save Changes'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: '1px solid rgba(226,232,240,0.8)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', color: '#64748b' }}>
            Cancel
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}
