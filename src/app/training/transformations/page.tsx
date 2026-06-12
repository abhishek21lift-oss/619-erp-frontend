'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Sparkles, Users, UserCheck, Weight, TrendingUp, Search, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }
};

function KpiCard({ label, value, icon, gradient }: {
  label: string; value: string | number; icon?: React.ReactNode; gradient: string
}) {
  return (
    <motion.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(139,92,246,0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'; }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
    </motion.div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
const td = { padding: '12px 16px', fontSize: 12 };

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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontWeight: 700, fontSize: 12 }}>
      {c.toFixed(1)} kg
      <Icon size={14} />
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 35%, #0f172a 65%, #0f0a1e 100%)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '25%', left: '65%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 40, left: '15%', width: 7, height: 7, borderRadius: '50%', background: 'rgba(139,92,246,0.35)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 50, right: '30%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(99,102,241,0.3)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(139,92,246,0.15)' }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Transformations</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Track member progress and body transformation journeys</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Members" value={clients.length} icon={<Users size={16} />} gradient="linear-gradient(135deg, rgba(37,99,235,0.25), rgba(30,27,75,0.7))" />
          <KpiCard label="Active Coaches" value={coaches} icon={<UserCheck size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="Avg Weight" value={avgWeight > 0 ? `${avgWeight.toFixed(0)} kg` : '—'} icon={<Weight size={16} />} gradient="linear-gradient(135deg, rgba(139,92,246,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="With Progress" value={clients.filter((c) => c.weight && Number(c.weight) > 0).length} icon={<TrendingUp size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,27,75,0.7))" />
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #8b5cf6, #6366f1)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Active Members</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{filtered.length} {filtered.length === 1 ? 'member' : 'members'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Search size={13} color="rgba(255,255,255,0.3)" />
                  <input placeholder="Search member or coach…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, outline: 'none', width: 180 }} />
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))' }}>
                    {['ID', 'Member Name', 'Coach', 'Start Weight', 'Current Weight', 'Joined Date', 'Action'].map((h) => (
                      <th key={h} style={{ ...th, color: '#c4b5fd' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} style={{ padding: '14px 16px' }}><div style={{ height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} /></td></tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <Sparkles size={24} color="#a78bfa" />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Fresh Start — No Members Yet</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 300 }}>Start by adding members and tracking their fitness journey. Transformation stories begin here!</div>
                      </div>
                    </td></tr>
                  ) : (
                    filtered.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                        <td style={td}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.1))', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.15)' }}>{c.client_id || '—'}</span>
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{c.name}</td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{c.trainer_name || '—'}</td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{c.weight ? `${c.weight} kg` : '—'}</td>
                        <td style={td}><WeightChange start={c.weight} current={c.weight} /></td>
                        <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(c.joining_date || c.pt_start_date)}</td>
                        <td style={td}>
                          <Link href={`/clients/${c.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))', color: '#c4b5fd', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(139,92,246,0.2)', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                            Log Progress <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </tr>
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
