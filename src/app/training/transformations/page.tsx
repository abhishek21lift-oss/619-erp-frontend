'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Sparkles, Users, UserCheck, Weight, TrendingUp, Search, ArrowUpRight, ArrowDownRight, Minus, Flame, Target, Trophy, Activity } from 'lucide-react';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } }
};

const KPI_COLORS = [
  { from: '#6366f1', to: '#8b5cf6', glow: 'rgba(99,102,241,0.3)' },
  { from: '#10b981', to: '#34d399', glow: 'rgba(16,185,129,0.3)' },
  { from: '#f59e0b', to: '#fbbf24', glow: 'rgba(245,158,11,0.3)' },
  { from: '#ec4899', to: '#f472b6', glow: 'rgba(236,72,153,0.3)' },
];

function KpiCard({ label, value, icon, gradient, colorIndex }: {
  label: string; value: string | number; icon?: React.ReactNode; gradient: string; colorIndex: number
}) {
  const c = KPI_COLORS[colorIndex % KPI_COLORS.length];
  return (
    <motion.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '24px 22px', background: gradient, border: '1px solid rgba(255,255,255,0.12)', boxShadow: `0 8px 32px ${c.glow}`, cursor: 'default', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 20px 60px ${c.glow}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = `0 8px 32px ${c.glow}`; }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${c.glow}, transparent 70%)`, pointerEvents: 'none' }} />
      <motion.div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,255,255,0.06), transparent)`, pointerEvents: 'none' }}
        animate={{ x: [0, 15, 0], y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1, textShadow: '0 2px 20px rgba(0,0,0,0.15)' }}>{value}</div>
    </motion.div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#a5b4fc' };
const td = { padding: '12px 16px', fontSize: 13 };

function WeightChange({ start, current }: { start?: number | null; current?: number | null }) {
  const s = Number(start || 0);
  const c = Number(current || 0);
  if (!s || !c) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>;
  const diff = c - s;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const color = isUp ? '#f87171' : isDown ? '#34d399' : 'rgba(255,255,255,0.5)';
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontWeight: 700, fontSize: 13 }}>
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
    <AppShell>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 25%, #0f172a 55%, #1e0a2e 80%, #0f0a1e 100%)', padding: '52px 32px 44px', borderRadius: '0 0 40px 40px' }}>
        <motion.div style={{ position: 'absolute', top: -100, right: -60, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={{ position: 'absolute', bottom: -80, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, -25, 35, 0], y: [0, 30, -15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={{ position: 'absolute', top: '20%', left: '60%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 15, -10, 0], y: [0, -15, 10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 18, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 8px 32px rgba(139,92,246,0.3)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Sparkles size={26} color="#fff" />
          </motion.div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fdf4ff, #c4b5fd, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Transformations</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>Track member progress and body transformation journeys</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
            {error}
          </motion.div>
        )}

        {/* ── KPI Grid ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <KpiCard label="Total Members" value={clients.length} icon={<Users size={16} />} colorIndex={0}
            gradient="linear-gradient(135deg, rgba(99,102,241,0.35), rgba(30,27,75,0.8))" />
          <KpiCard label="Active Coaches" value={coaches} icon={<UserCheck size={16} />} colorIndex={1}
            gradient="linear-gradient(135deg, rgba(16,185,129,0.3), rgba(30,27,75,0.8))" />
          <KpiCard label="Avg Weight" value={avgWeight > 0 ? `${avgWeight.toFixed(0)} kg` : '—'} icon={<Weight size={16} />} colorIndex={2}
            gradient="linear-gradient(135deg, rgba(245,158,11,0.3), rgba(30,27,75,0.8))" />
          <KpiCard label="With Progress" value={clients.filter((c) => c.weight && Number(c.weight) > 0).length} icon={<TrendingUp size={16} />} colorIndex={3}
            gradient="linear-gradient(135deg, rgba(236,72,153,0.3), rgba(30,27,75,0.8))" />
        </motion.div>

        {/* ── Quick Stats Row ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Avg Progress per Member', value: clients.length ? `${((clients.filter(c => c.weight && Number(c.weight) > 0).length / clients.length) * 100).toFixed(0)}%` : '—', icon: <Activity size={14} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Goal Completion Rate', value: '—', icon: <Target size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Top Performer', value: clients.length ? clients.reduce((best, c) => (c.weight && Number(c.weight) > Number(best.weight || 0)) ? c : best, clients[0]).name : '—', icon: <Trophy size={14} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          ].map((stat, i) => (
            <motion.div key={stat.label} variants={itemVariants}
              style={{ borderRadius: 16, padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</div>
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{stat.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Members Table ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, height: 18, borderRadius: 3, background: 'linear-gradient(180deg, #8b5cf6, #ec4899)', display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Active Members</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>{filtered.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Search size={13} color="rgba(255,255,255,0.3)" />
                  <input placeholder="Search member or coach…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 500, outline: 'none', width: 200, placeholderColor: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1), rgba(236,72,153,0.08))' }}>
                    {['ID', 'Member Name', 'Coach', 'Start Weight', 'Current Weight', 'Joined Date', 'Action'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} style={{ padding: '14px 16px' }}>
                        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                          style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                      </td></tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 50, textAlign: 'center' }}>
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <Sparkles size={28} color="#a78bfa" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>Ready to start tracking?</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 360, lineHeight: 1.5 }}>Add members and begin logging their transformation journey. Every rep, every kg counts!</div>
                      </motion.div>
                    </td></tr>
                  ) : (
                    filtered.map((c, i) => (
                      <motion.tr key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                        <td style={td}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.15)' }}>{c.client_id || '—'}</span>
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6'][Math.abs(c.name.split('').reduce((a,ch) => ((a<<5)-a)+ch.charCodeAt(0),0)) % 6]}, #1e1b4b)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>
                              {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            {c.name}
                          </span>
                        </td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.5)' }}>{c.trainer_name || '—'}</td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.5)' }}>{c.weight ? `${c.weight} kg` : '—'}</td>
                        <td style={td}><WeightChange start={c.weight} current={c.weight} /></td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(c.joining_date || c.pt_start_date)}</td>
                        <td style={td}>
                          <Link href={`/clients/${c.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))', color: '#c4b5fd', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(139,92,246,0.2)', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(236,72,153,0.2))'; e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            Log Progress <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
}
