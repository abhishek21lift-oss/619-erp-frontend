'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { TrendingUp, Users, UserCheck, Activity, Zap, Target, Sparkles, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ConversionFunnelPage() { return <Guard role="admin"><Inner /></Guard>; }

function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.clients.list({}).then(r => setClients(r)).catch(e => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false));
  }, []);

  const stages = useMemo(() => {
    const leads = clients.filter(c => c.status === 'lead' || !c.pt_end_date).length;
    const trials = clients.filter(c => (c.notes || '').toLowerCase().includes('trial') || c.status === 'trial').length;
    const converted = clients.filter(c => c.pt_end_date && Number(c.final_amount || 0) > 0).length;
    const active = clients.filter(c => c.status === 'active').length;
    const all = clients.length;
    return [
      { key: 'leads', label: 'Enquiries', value: leads, color: '#7c3aed', gradient: 'from-violet-500 to-purple-600', icon: <Users size={16} />, desc: 'Total leads in inbox' },
      { key: 'trials', label: 'Trials', value: trials, color: '#f59e0b', gradient: 'from-amber-400 to-orange-500', icon: <Activity size={16} />, desc: 'Trial / tour booked' },
      { key: 'converted', label: 'Converted', value: converted, color: '#10b981', gradient: 'from-emerald-500 to-teal-500', icon: <UserCheck size={16} />, desc: 'Paid & joined' },
      { key: 'active', label: 'Active', value: active, color: '#0ea5e9', gradient: 'from-blue-500 to-cyan-500', icon: <Zap size={16} />, desc: 'Currently active members' },
    ];
  }, [clients]);

  const leadCount = stages[0]?.value || 0;
  const convertedCount = stages[2]?.value || 0;
  const total = clients.length;
  const convRate = (leadCount + convertedCount) > 0 ? Math.round((convertedCount / (leadCount + convertedCount)) * 100) : 0;
  const max = Math.max(...stages.map(s => s.value), 1);

  const cLeads = useCounter(leadCount);
  const cConv = useCounter(convertedCount);
  const cRate = useCounter(convRate);
  const cTotal = useCounter(total);

  const chartData = stages.map(s => ({ name: s.label, value: s.value }));

  const insights = [
    { icon: '🎯', title: 'Conversion Focus', body: convRate < 30 ? 'Your lead-to-member rate is below average. Focus on faster follow-ups within 24 hours.' : 'Strong conversion rate! Keep following up within 24 hours of enquiry.' },
    { icon: '⚡', title: 'Trial Conversion', body: stages[1]?.value > 0 ? `${stages[1].value} leads are at trial stage — ensure a premium trial experience to maximize conversions.` : 'No trials tracked yet. Start booking trial sessions to warm up leads.' },
    { icon: '📈', title: 'Growth Trend', body: `You have ${total} total records. A healthy gym converts 25–40% of enquiries in 30 days.` },
  ];

  return (
    <AppShell>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-20 right-1/4 w-96 h-96 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1, padding: '1.5rem 1.75rem', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)' }}>
              <BarChart2 size={14} className="text-white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Conversion Funnel</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 40 }}>Track how leads move through your sales pipeline</p>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

        {/* KPIs */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Open Leads', value: cLeads, color: '#7c3aed', gradient: 'from-violet-500 to-purple-600', icon: <Users size={18} /> },
            { label: 'Conversions', value: cConv, color: '#10b981', gradient: 'from-emerald-500 to-teal-500', icon: <UserCheck size={18} /> },
            { label: 'Conv. Rate', value: `${cRate}%`, color: '#0ea5e9', gradient: 'from-blue-500 to-cyan-500', icon: <TrendingUp size={18} /> },
            { label: 'Total Records', value: cTotal, color: '#f59e0b', gradient: 'from-amber-400 to-orange-500', icon: <Target size={18} /> },
          ].map((k, i) => (
            <motion.div key={k.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${k.gradient} mb-3`}>{k.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 5 }}>{k.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
          {/* LEFT: Funnel + Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Funnel stages */}
            <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Pipeline Stages</div>
              {loading ? (
                <div style={{ color: 'var(--text-disabled)', fontSize: 14, textAlign: 'center', padding: '2rem' }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stages.map((s, i) => {
                    const pct = Math.round((s.value / max) * 100);
                    const dropPct = i > 0 && stages[i - 1].value > 0
                      ? Math.round((1 - s.value / stages[i - 1].value) * 100)
                      : null;
                    return (
                      <motion.div key={s.key}
                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${s.gradient}`}>{s.icon}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{s.desc}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {dropPct !== null && dropPct > 0 && (
                              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, background: '#fef2f2', padding: '2px 8px', borderRadius: 20 }}>↓ {dropPct}% drop</div>
                            )}
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                          </div>
                        </div>
                        <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.4 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${s.color}, ${s.color}99)` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bar chart */}
            <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Stage Comparison</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={40}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-disabled)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-disabled)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={stages[i]?.color || '#7c3aed'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Sparkles size={14} style={{ color: '#7c3aed' }} />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>AI Insights</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {insights.map((ins, i) => (
                  <motion.div key={ins.title}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                    style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.08)' }}
                  >
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{ins.icon} <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{ins.title}</span></div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>{ins.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Conversion rate gauge */}
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(14,165,233,0.04))', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 20, padding: '1.25rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#10b981', marginBottom: 12 }}>Conversion Rate</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.05em', lineHeight: 1 }}>{convRate}<span style={{ fontSize: 20 }}>%</span></div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Industry benchmark: 25–40%</p>
              <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', marginTop: 10, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${Math.min(convRate, 100)}%` }}
                  transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10b981, #0ea5e9)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
