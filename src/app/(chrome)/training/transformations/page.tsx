'use client';
import { useEffect, useMemo, useState } from 'react';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import Link from 'next/link';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { Sparkles, Users, UserCheck, Weight, TrendingUp, Search, ArrowUpRight, ArrowDownRight, Minus, Target, Trophy, Activity } from 'lucide-react';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { PremiumMetricCardStandard, MetricGroup, metricTone } from '@/components/visualizations';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } }
};

const th = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-muted)' };
const td = { padding: '12px 16px', fontSize: 13 };

/** A drop in weight is the good direction here, so the tone is inverted
 *  from a plain "up is good" trend — a gain reads as the concerning one. */
function WeightChange({ start, current }: { start?: number | null; current?: number | null }) {
  const s = Number(start || 0);
  const c = Number(current || 0);
  if (!s || !c) return <span style={{ color: 'var(--text-disabled)' }}>—</span>;
  const diff = c - s;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const tone = isUp ? metricTone.negative : isDown ? metricTone.positive : metricTone.neutral;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tone.color, fontWeight: 700, fontSize: 13 }}>
      {c.toFixed(1)} kg
      <Icon size={15} />
    </span>
  );
}

export default function TransformationsPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    api.clients.list({ status: 'active' })
      .then((r) => alive && setClients(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(
      (c) => c.name?.toLowerCase().includes(s) ||
        (c.client_id || '').toLowerCase().includes(s) ||
        (c.trainer_name || '').toLowerCase().includes(s),
    );
  }, [clients, search]);

  const coaches = useMemo(() => {
    const set = new Set(clients.map((c) => c.trainer_name).filter(Boolean));
    return set.size;
  }, [clients]);

  const avgWeight = useMemo(() => {
    const withWeight = clients.filter((c) => c.weight && Number(c.weight) > 0);
    if (withWeight.length === 0) return 0;
    return withWeight.reduce((s, c) => s + Number(c.weight), 0) / withWeight.length;
  }, [clients]);

  return (
    <>
      {/* ── Hero ── */}
      <div style={{ background: 'var(--bg-subtle)', padding: '52px 32px 44px', borderRadius: '0 0 40px 40px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg, #0067e0, #0059ce)', boxShadow: '0 8px 32px rgba(0,103,224,0.3)', border: '1px solid var(--border)' }}>
            <Sparkles size={26} color="#fff" />
          </m.div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Transformations</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-muted)' }}>Track member progress and body transformation journeys</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
            {error}
          </m.div>
        )}

        {/* ── KPI Grid ── */}
        <div style={{ marginBottom: 28 }}>
          <MetricGroup columns={4}>
            <PremiumMetricCardStandard label="Total Members" value={clients.length} icon={<Users size={16} />} loading={loading} />
            <PremiumMetricCardStandard label="Active Coaches" value={coaches} icon={<UserCheck size={16} />} loading={loading} />
            <PremiumMetricCardStandard label="Avg Weight" value={avgWeight > 0 ? `${avgWeight.toFixed(0)} kg` : '—'} icon={<Weight size={16} />} loading={loading} />
            <PremiumMetricCardStandard label="With Progress" value={clients.filter((c) => c.weight && Number(c.weight) > 0).length} icon={<TrendingUp size={16} />} loading={loading} />
          </MetricGroup>
        </div>

        {/* ── Quick Stats Row ── */}
        <div style={{ marginBottom: 28 }}>
          <MetricGroup columns={3}>
            <PremiumMetricCardStandard
              label="Avg Progress per Member" icon={<Activity size={14} />} loading={loading}
              value={clients.length ? `${((clients.filter(c => c.weight && Number(c.weight) > 0).length / clients.length) * 100).toFixed(0)}%` : '—'}
            />
            <PremiumMetricCardStandard
              label="Goal Completion Rate" icon={<Target size={14} />} loading={loading}
              value={clients.length ? (() => {
                const achieved = clients.filter(c => {
                  const start = Number((c as Record<string, unknown>).initial_weight ?? (c as Record<string, unknown>).start_weight ?? 0);
                  const curr = Number(c.weight ?? 0);
                  return start > 0 && curr > 0 && curr < start;
                }).length;
                return `${((achieved / clients.length) * 100).toFixed(0)}%`;
              })() : '—'}
            />
            <PremiumMetricCardStandard
              label="Top Performer" icon={<Trophy size={14} />} loading={loading}
              value={clients.length ? (() => {
                const best = clients.reduce((b, c) => {
                  const cStart = Number((c as Record<string, unknown>).initial_weight ?? (c as Record<string, unknown>).start_weight ?? 0);
                  const cCurr = Number(c.weight ?? 0);
                  const cLoss = cStart > 0 && cCurr > 0 ? cStart - cCurr : 0;
                  const bStart = Number((b as Record<string, unknown>).initial_weight ?? (b as Record<string, unknown>).start_weight ?? 0);
                  const bCurr = Number(b.weight ?? 0);
                  const bLoss = bStart > 0 && bCurr > 0 ? bStart - bCurr : 0;
                  return cLoss > bLoss ? c : b;
                }, clients[0]);
                return best.name ?? '—';
              })() : '—'}
            />
          </MetricGroup>
        </div>

        {/* ── Members Table ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible">
          <m.div variants={itemVariants}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(180deg, #0067e0, #0059ce)', display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Active Members</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(0,103,224,0.1)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.2)' }}>{filtered.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '6px 14px', border: '1px solid #cbd5e1' }}>
                  <Search size={13} color="#94a3b8" />
                  <input aria-label="Search member or coach" placeholder="Search member or coach…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500, width: 200 }} />
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['ID', 'Member Name', 'Coach', 'Start Weight', 'Current Weight', 'Joined Date', 'Action'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} style={{ padding: '14px 16px' }}>
                        <m.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} />
                      </td></tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 50, textAlign: 'center' }}>
                      <m.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(0,103,224,0.12), rgba(0,103,224,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,103,224,0.15)' }}>
                          <Sparkles size={28} color="#0067e0" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-secondary)' }}>Ready to start tracking?</div>
                        <div style={{ fontSize: 13, color: 'var(--text-disabled)', maxWidth: 360, lineHeight: 1.5 }}>Add members and begin logging their transformation journey. Every rep, every kg counts!</div>
                      </m.div>
                    </td></tr>
                  ) : (
                    filtered.map((c, i) => (
                      <m.tr key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,103,224,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f8fafc' : '#fff'; }}>
                        <td style={td}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(0,103,224,0.08)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.15)' }}>{c.client_id || '—'}</span>
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClientAvatar name={c.name} photoUrl={c.photo_url}
                              style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${['#0067e0','#10b981','#f59e0b','#0067e0','#0067e0','#0067e0'][Math.abs(c.name.split('').reduce((a,ch) => ((a<<5)-a)+ch.charCodeAt(0),0)) % 6]}, #7fb4ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }} />
                            {c.name}
                          </span>
                        </td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{c.trainer_name || '—'}</td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{c.weight ? `${c.weight} kg` : '—'}</td>
                        <td style={td}><WeightChange start={(c as any).initial_weight ?? (c as any).start_weight} current={c.weight} /></td>
                        <td style={{ ...td, color: 'var(--text-muted)' }}>{fmtDate(c.joining_date || c.pt_start_date)}</td>
                        <td style={td}>
                          <Link href={`/clients/${c.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10, background: 'rgba(0,103,224,0.08)', color: '#0067e0', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(0,103,224,0.2)', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,103,224,0.15)'; e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,103,224,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,103,224,0.08)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            Log Progress <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </m.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </m.div>
        </m.div>
      </div>
    </>
  );
}
