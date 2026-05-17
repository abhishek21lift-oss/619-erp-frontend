'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { TrendingUp, TrendingDown, Award, Sparkles, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const SOURCE_META: Record<string, { icon: string; color: string; gradient: string }> = {
  'Walk-in':          { icon: '🚶', color: '#6366f1', gradient: 'from-violet-500 to-indigo-500' },
  'Instagram':        { icon: '📸', color: '#e1306c', gradient: 'from-pink-500 to-rose-500' },
  'Facebook':         { icon: '📘', color: '#1877f2', gradient: 'from-blue-500 to-cyan-500' },
  'Google':           { icon: '🔍', color: '#ea4335', gradient: 'from-red-400 to-orange-400' },
  'Referral':         { icon: '🤝', color: '#16a34a', gradient: 'from-emerald-500 to-teal-500' },
  'Banner / Hoarding':{ icon: '🪧', color: '#d97706', gradient: 'from-amber-400 to-orange-500' },
  'WhatsApp':         { icon: '💬', color: '#25d366', gradient: 'from-green-400 to-emerald-500' },
  'Existing Member':  { icon: '⭐', color: '#f59e0b', gradient: 'from-yellow-400 to-amber-500' },
  'Other':            { icon: '📌', color: '#64748b', gradient: 'from-slate-400 to-slate-500' },
};

function getMeta(src: string) {
  return SOURCE_META[src] || { icon: '📌', color: '#64748b', gradient: 'from-slate-400 to-slate-500' };
}

export default function LeadSourcesPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.clients.list({}).then(r => setClients(r)).finally(() => setLoading(false));
  }, []);

  const breakdown = useMemo(() => {
    const counts = new Map<string, { total: number; converted: number }>();
    for (const c of clients) {
      const src = (c.reference_no || 'Walk-in').trim() || 'Walk-in';
      const row = counts.get(src) || { total: 0, converted: 0 };
      row.total++;
      if (c.pt_end_date && Number(c.final_amount || 0) > 0) row.converted++;
      counts.set(src, row);
    }
    return Array.from(counts.entries())
      .map(([source, v]) => ({
        source, total: v.total, converted: v.converted,
        rate: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [clients]);

  const totalLeads = breakdown.reduce((s, r) => s + r.total, 0);
  const totalConverted = breakdown.reduce((s, r) => s + r.converted, 0);
  const overallRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;
  const bestSource = breakdown.sort((a, b) => b.rate - a.rate)[0];
  const topByVolume = [...breakdown].sort((a, b) => b.total - a.total)[0];

  const pieData = breakdown.slice(0, 6).map(r => ({ name: r.source, value: r.total, color: getMeta(r.source).color }));
  const barData = breakdown.slice(0, 6).map(r => ({ name: r.source.split(' ')[0], conv: r.rate }));

  const kpis = [
    { label: 'Total Leads', value: totalLeads, icon: '👥', gradient: 'from-violet-500 to-purple-600', sub: 'Across all sources' },
    { label: 'Best Conv. Source', value: bestSource?.source || '—', icon: '🏆', gradient: 'from-amber-400 to-orange-500', sub: `${bestSource?.rate || 0}% rate`, small: true },
    { label: 'Overall Conv. %', value: `${overallRate}%`, icon: '📈', gradient: 'from-emerald-500 to-teal-500', sub: 'Leads → Members' },
    { label: 'Top Volume Source', value: topByVolume?.source || '—', icon: '🚀', gradient: 'from-blue-500 to-cyan-500', sub: `${topByVolume?.total || 0} leads`, small: true },
  ];

  const insights = [
    bestSource && { icon: '🏆', title: 'Best Performing Channel', body: `${bestSource.source} has your highest conversion rate at ${bestSource.rate}%. Invest more here.` },
    breakdown.length > 0 && { icon: '⚠️', title: 'Low Performers', body: breakdown.filter(r => r.rate < 15 && r.total > 2).map(r => r.source).join(', ') || 'All channels performing well.' },
    { icon: '💡', title: 'Marketing Tip', body: 'Referrals typically convert 2–3× better than paid channels. Consider a referral incentive program.' },
  ].filter(Boolean) as { icon: string; title: string; body: string }[];

  return (
    <AppShell>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-10 left-1/3 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1, padding: '1.5rem 1.75rem', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              <PieIcon size={14} className="text-white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Lead Sources</h1>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginLeft: 40 }}>Marketing intelligence — understand where your best leads come from</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {kpis.map((k, i) => (
            <motion.div key={k.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}
              style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg bg-gradient-to-br ${k.gradient} mb-3`}>{k.icon}</div>
              <div style={{ fontSize: k.small ? 16 : 26, fontWeight: 800, letterSpacing: k.small ? '-0.01em' : '-0.04em', color: '#0f172a', lineHeight: 1.2 }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginTop: 5 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Source Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Source Breakdown</div>
              {loading ? (
                <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '2rem' }}>Loading…</div>
              ) : breakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>No data yet</div>
                  <p style={{ fontSize: 12 }}>Add enquiries to see source analytics.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {breakdown.map((r, i) => {
                    const meta = getMeta(r.source);
                    const sharePct = Math.round((r.total / totalLeads) * 100);
                    return (
                      <motion.div key={r.source}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                        style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.05)', background: 'rgba(248,250,252,0.6)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${meta.gradient}`}>{meta.icon}</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{r.source}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.total} leads · {r.converted} converted</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: 13, fontWeight: 800,
                              color: r.rate >= 40 ? '#10b981' : r.rate >= 20 ? '#f59e0b' : '#ef4444',
                              display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end'
                            }}>
                              {r.rate >= 30 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {r.rate}%
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{sharePct}% share</div>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                          <motion.div
                            animate={{ width: `${sharePct}%` }}
                            transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Charts + Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Pie chart */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Lead Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Conv rate bar */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Conversion % by Source</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={barData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="conv" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={getMeta(breakdown[i]?.source || '').color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Insights */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles size={14} style={{ color: '#f59e0b' }} />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0f172a' }}>Marketing Insights</div>
              </div>
              {insights.map((ins, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)', marginBottom: 8 }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{ins.icon} {ins.title}</div>
                  <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.55, margin: 0 }}>{ins.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
