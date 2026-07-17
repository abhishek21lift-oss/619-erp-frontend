'use client';
import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { RefreshCcw, Users, AlertTriangle, CalendarClock, Percent, Clock, UserCheck } from 'lucide-react';
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
    <m.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
    </m.div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left' as const, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
const td = { padding: '12px 16px', fontSize: 12 };

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
      <div style={{ background: 'var(--bg-subtle)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 8px 32px rgba(124,58,237,0.2)', border: '1px solid var(--border)' }}>
            <RefreshCcw size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Renewal Report</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Monitor membership renewals and upcoming expirations</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Active Members" value={stats.active} icon={<Users size={16} />} gradient="linear-gradient(135deg, #f0fdf4, #fff)" />
          <KpiCard label="Expiring in 7 Days" value={stats.expiring7} icon={<AlertTriangle size={16} />} gradient="linear-gradient(135deg, #fef2f2, #fff)" />
          <KpiCard label="Expiring in 30 Days" value={stats.expiring30} icon={<CalendarClock size={16} />} gradient="linear-gradient(135deg, #fffbeb, #fff)" />
          <KpiCard label="Renewal Rate" value={`${stats.renewalRate}%`} icon={<Percent size={16} />} gradient="linear-gradient(135deg, #eff6ff, #fff)" />
        </m.div>

        <m.div variants={containerVariants} initial="hidden" animate="visible">
          <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', background: 'var(--bg-card)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #7c3aed, #6366f1)', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Members Up for Renewal — Next 30 Days</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{upcoming.length} {upcoming.length === 1 ? 'member' : 'members'}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['Member', 'Plan', 'Coach', 'Expiry Date', 'Days Left'].map((h) => (
                      <th key={h} style={{ ...th, color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} style={{ padding: '14px 16px' }}><div style={{ height: 14, background: 'var(--bg-subtle)', borderRadius: 6 }} /></td></tr>
                    ))
                  ) : upcoming.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                          <UserCheck size={24} color="#34d399" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#34d399' }}>No Renewals Due</div>
                        <div style={{ fontSize: 13, color: 'var(--text-disabled)', maxWidth: 320 }}>No active memberships are expiring in the next 30 days. Enjoy the calm!</div>
                      </div>
                    </td></tr>
                  ) : (
                    upcoming.map((c, i) => {
                      const days = Math.ceil((new Date(c.pt_end_date!).getTime() - Date.now()) / 86400000);
                      const daysColor = days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : '#10b981';
                      const daysBg = days <= 7 ? 'rgba(239,68,68,0.08)' : days <= 14 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
                      return (
                        <tr key={c.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', background: i % 2 === 0 ? '#f9fafb' : '#fff' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f9fafb' : '#fff'; }}>
                          <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                          <td style={{ ...td }}>
                            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.12)' }}>{c.package_type || '—'}</span>
                          </td>
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{c.trainer_name || '—'}</td>
                          <td style={{ ...td, color: 'var(--text-muted)' }}>{fmtDate(c.pt_end_date)}</td>
                          <td style={td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: daysBg, color: daysColor, border: `1px solid ${daysColor}30` }}>
                              <Clock size={12} />
                              {days} {days === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </m.div>
        </m.div>
      </div>
    </AppShell>
  );
}
