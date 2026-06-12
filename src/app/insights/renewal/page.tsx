'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { RefreshCcw, Users, AlertTriangle, CalendarClock, Percent } from 'lucide-react';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';

function fadeUp(i: number) {
  return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } };
}

export default function RenewalAnalysisPage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.clients
      .list({})
      .then((r) => alive && setClients(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = clients.filter((c) => c.status === 'active').length;
    const expired = clients.filter((c) => c.status === 'expired').length;
    const expiring7 = clients.filter((c) => {
      if (!c.pt_end_date || c.status !== 'active') return false;
      const days = Math.ceil((new Date(c.pt_end_date).getTime() - now) / 86400000);
      return days >= 0 && days <= 7;
    }).length;
    const expiring30 = clients.filter((c) => {
      if (!c.pt_end_date || c.status !== 'active') return false;
      const days = Math.ceil((new Date(c.pt_end_date).getTime() - now) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    const renewalRate = active + expired > 0 ? Math.round((active / (active + expired)) * 100) : 0;
    return { active, expired, expiring7, expiring30, renewalRate };
  }, [clients]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return clients
      .filter((c) => {
        if (!c.pt_end_date || c.status !== 'active') return false;
        const days = Math.ceil((new Date(c.pt_end_date).getTime() - now) / 86400000);
        return days >= 0 && days <= 30;
      })
      .sort((a, b) => new Date(a.pt_end_date!).getTime() - new Date(b.pt_end_date!).getTime());
  }, [clients]);

  return (
    <AppShell>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 32px 40px', borderRadius: '0 0 32px 32px' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <RefreshCcw size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Renewal Report</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Monitor membership renewals and upcoming expirations</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} {...fadeUp(0)}>
          {[
            { label: 'Active Members', value: stats.active, icon: <Users size={16} />, color: '#10b981' },
            { label: 'Expiring in 7 Days', value: stats.expiring7, icon: <AlertTriangle size={16} />, color: '#ef4444' },
            { label: 'Expiring in 30 Days', value: stats.expiring30, icon: <CalendarClock size={16} />, color: '#f59e0b' },
            { label: 'Renewal Rate', value: `${stats.renewalRate}%`, icon: <Percent size={16} />, color: '#3b82f6' },
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
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Members Up for Renewal — Next 30 Days</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{upcoming.length} {upcoming.length === 1 ? 'member' : 'members'}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Member', 'Plan', 'Coach', 'Expiry Date', 'Days Left'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</td></tr>
                ) : upcoming.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No active memberships expiring in the next 30 days.</td></tr>
                ) : (
                  upcoming.map((c) => {
                    const days = Math.ceil((new Date(c.pt_end_date!).getTime() - Date.now()) / 86400000);
                    const daysColor = days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : '#10b981';
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{c.name}</td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{c.package_type || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{c.trainer_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)' }}>{fmtDate(c.pt_end_date)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: daysColor }}>{days}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
