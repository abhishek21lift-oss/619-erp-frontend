'use client';

import { useState, useEffect, useMemo } from 'react';
import { m } from 'framer-motion';
import { CreditCard, Search, Users, RefreshCw, Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

const A = '#F59E0B', B = '#D97706';
const fmtINR = (n: number | string | null | undefined) => '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
const iv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } } };

interface Subscription { id: string; clientName: string; planName: string; planAmount: number; startDate: string; endDate: string; daysLeft: number; status: 'active' | 'expiring' | 'expired'; }

function deriveStatus(d: number): Subscription['status'] { return d <= 0 ? 'expired' : d <= 30 ? 'expiring' : 'active'; }

export default function SubscriptionPage() {
  return <Guard role="admin"><AppShell><PageContent /></AppShell></Guard>;
}

function PageContent() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResult, clientsRes] = await Promise.all([
        api.pt.plans.list(),
        api.clients.list({}),
      ]);
      const plansArr = ((plansResult as any)?.data ?? (Array.isArray(plansResult) ? plansResult : [])) as any[];
      const plans = new Map(plansArr.map((p: any) => [p.id ?? p.name, p]));
      const clients = Array.isArray(clientsRes) ? clientsRes : [];
      const result: Subscription[] = [];
      for (const c of clients as any[]) {
        const planId = c.pt_package_id ?? c.plan_name ?? c.package_type ?? c.membership_plan;
        if (!planId) continue;
        const plan = plans.get(planId) ?? { name: planId, base_amount: c.final_amount ?? 0 };
        const end = c.pt_end_date ?? c.expiry_date ?? c.subscription_end_date;
        if (!end) continue;
        const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
        result.push({
          id: c.id, clientName: c.name, planName: plan.name ?? String(planId), planAmount: Number(plan.base_amount ?? c.final_amount ?? 0),
          startDate: c.pt_start_date ?? c.subscription_start_date ?? c.joining_date ?? '—', endDate: end, daysLeft: days, status: deriveStatus(days),
        });
      }
      result.sort((a, b) => a.daysLeft - b.daysLeft);
      setSubs(result);
    } catch { setSubs([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let list = subs;
    if (search) { const q = search.toLowerCase(); list = list.filter(s => s.clientName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q)); }
    if (filter !== 'all') list = list.filter(s => s.status === filter);
    return list;
  }, [subs, search, filter]);

  const kpis = useMemo(() => {
    const active = subs.filter(s => s.status === 'active');
    const expiring = subs.filter(s => s.status === 'expiring');
    const rev = subs.reduce((a, s) => a + s.planAmount, 0);
    return { totalActive: active.length, expiringThisMonth: expiring.length, revenueThisMonth: rev, avgValue: subs.length ? Math.round(rev / subs.length) : 0 };
  }, [subs]);

  const kpiCards = [
    { label: 'Total Active Subscriptions', value: kpis.totalActive, icon: <Users size={18} />, iconBg: 'rgba(245,158,11,0.1)', iconColor: A },
    { label: 'Expiring This Month', value: kpis.expiringThisMonth, icon: <Calendar size={18} />, iconBg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444' },
    { label: 'Revenue from Subscriptions', value: fmtINR(kpis.revenueThisMonth), icon: <DollarSign size={18} />, iconBg: 'rgba(245,158,11,0.1)', iconColor: A },
    { label: 'Average Subscription Value', value: fmtINR(kpis.avgValue), icon: <TrendingUp size={18} />, iconBg: 'rgba(245,158,11,0.1)', iconColor: B },
  ];

  const tabs = [
    { value: 'all', label: 'All', color: A },
    { value: 'active', label: 'Active', color: '#10b981' },
    { value: 'expiring', label: 'Expiring', color: A },
    { value: 'expired', label: 'Expired', color: '#ef4444' },
  ];

  return (
    <div style={{ position: 'relative', zIndex: 1, paddingBottom: 40 }}>
      <m.div variants={cv} initial="hidden" animate="visible" style={{ position: 'relative', zIndex: 2 }}>
        <m.div variants={iv} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '40px 36px', marginBottom: 28, background: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fff)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${A}, ${B})`, color: '#fff', boxShadow: `0 8px 24px ${A}55` }}>
              <CreditCard size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 860, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>Subscriptions</h1>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, display: 'inline-block' }} />
                Track and manage all client subscriptions
              </p>
            </div>
          </div>
        </m.div>

        <m.div variants={iv} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {kpiCards.map((k, i) => (
            <m.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '20px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>{k.label}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: k.iconBg, color: k.iconColor }}>
                  {k.icon}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{k.value}</p>
            </m.div>
          ))}
        </m.div>

        <m.div variants={iv} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search client or plan..." value={search} onChange={e => setSearch(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = A; e.currentTarget.style.boxShadow = `0 0 0 3px ${A}22`; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = ''; }}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 11, fontSize: 12.5, fontWeight: 500, outline: 'none', border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', transition: 'all 0.2s' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 11, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            {tabs.map(t => (
              <button key={t.value} onClick={() => setFilter(t.value)}
                style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: filter === t.value ? `${t.color}18` : 'transparent', color: filter === t.value ? t.color : '#9ca3af', boxShadow: filter === t.value ? `0 1px 4px ${t.color}22` : 'none' }}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={11} /> Refresh
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--text-disabled)' }}>
            {filtered.length} <span style={{ color: '#d1d5db' }}>/</span> {subs.length}
          </span>
        </m.div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <m.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${A}22`, borderTopColor: A }} />
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-disabled)' }}>Loading subscriptions...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <m.div variants={iv} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', borderRadius: 22, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 22, marginBottom: 16, background: `rgba(245,158,11,0.08)` }}>
              <CreditCard size={34} style={{ color: A }} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 760, letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: 0 }}>No subscriptions yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-disabled)', margin: '6px 0 0 0' }}>{search || filter !== 'all' ? 'Try adjusting your filters' : 'Assign a PT plan to a client to get started'}</p>
          </m.div>
        ) : (
          <m.div variants={cv} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {filtered.map(sub => {
              const bc = sub.status === 'active' ? '#10b981' : sub.status === 'expiring' ? A : '#ef4444';
              const bb = sub.status === 'active' ? '#10b98118' : sub.status === 'expiring' ? `${A}18` : '#ef444418';
              const dc = sub.daysLeft <= 0 ? '#ef4444' : sub.daysLeft <= 30 ? A : '#10b981';
              return (
                <m.div key={sub.id} variants={iv} whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: `rgba(245,158,11,0.1)`, color: B, fontSize: 13, fontWeight: 800 }}>
                        {sub.clientName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 720, color: 'var(--text-primary)', lineHeight: 1.3 }}>{sub.clientName}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: 11, fontWeight: 600, color: 'var(--text-disabled)' }}>{sub.planName}</p>
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: bb, color: bc }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: bc, display: 'inline-block' }} />
                      {sub.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} style={{ color: dc }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: dc, margin: 0 }}>{sub.daysLeft <= 0 ? 'Expired' : `${sub.daysLeft} days left`}</span>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg, ${A}, ${B})`, color: '#fff', boxShadow: `0 2px 8px ${A}44` }}>
                      {fmtINR(sub.planAmount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-disabled)' }}>
                    <span>Start: <strong style={{ color: 'var(--text-secondary)' }}>{sub.startDate}</strong></span>
                    <span>End: <strong style={{ color: 'var(--text-secondary)' }}>{sub.endDate}</strong></span>
                  </div>
                </m.div>
              );
            })}
          </m.div>
        )}
      </m.div>
    </div>
  );
}
