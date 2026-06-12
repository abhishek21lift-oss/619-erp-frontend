'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Sparkles, Users, UserCheck, Weight, TrendingUp } from 'lucide-react';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';

function fadeUp(i: number) {
  return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } };
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 32px 40px', borderRadius: '0 0 32px 32px' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.1), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Transformations</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Track member progress and body transformation journeys</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} {...fadeUp(0)}>
          {[
            { label: 'Total Members', value: clients.length, icon: <Users size={16} />, color: '#3b82f6' },
            { label: 'Active Coaches', value: coaches, icon: <UserCheck size={16} />, color: '#10b981' },
            { label: 'Avg Weight', value: avgWeight > 0 ? `${avgWeight.toFixed(0)} kg` : '—', icon: <Weight size={16} />, color: '#8b5cf6' },
            { label: 'With Progress', value: clients.filter((c) => c.weight && Number(c.weight) > 0).length, icon: <TrendingUp size={16} />, color: '#f59e0b' },
          ].map((kpi, i) => (
            <motion.div key={i} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }} {...fadeUp(i + 1)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.45)' }}>{kpi.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: `${kpi.color}20`, color: kpi.color }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{kpi.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }} {...fadeUp(5)}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Active Members</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{filtered.length} {filtered.length === 1 ? 'member' : 'members'}</span>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <input placeholder="Search member or coach…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, outline: 'none', width: 160 }} />
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['ID', 'Member Name', 'Coach', 'Start Weight', 'Current Weight', 'Joined Date', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No active members yet.</td></tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{c.client_id || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{c.name}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{c.trainer_name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{c.weight ? `${c.weight} kg` : '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>—</td>
                      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{fmtDate(c.joining_date || c.pt_start_date)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Link href={`/clients/${c.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(59,130,246,0.2)' }}>Log Progress →</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
