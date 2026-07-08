'use client';
import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Activity, Users, Clock, TrendingUp, Calendar, BarChart3, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';

const HOURS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

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
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,182,212,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)', color: '#0891b2' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{value}</div>
    </m.div>
  );
}

export default function FootfallTrafficPage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  })();

  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.attendance
      .list({ from, to, type: 'client' })
      .then((r: any) => alive && setRecords(Array.isArray(r) ? r : []))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to]);

  const byHour = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.check_in) continue;
      const h = String(r.check_in).slice(0, 2);
      map.set(h, (map.get(h) || 0) + 1);
    }
    return HOURS.map((h) => ({ hour: h, count: map.get(h) || 0 }));
  }, [records]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.date) continue;
      map.set(r.date, (map.get(r.date) || 0) + 1);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
  }, [records]);

  const max = Math.max(...byHour.map((h) => h.count), 1);
  const totalCheckins = records.length;
  const peakHour = byHour.reduce((b, h) => (h.count > b.count ? h : b), byHour[0]);
  const avgDaily = byDay.length > 0 ? Math.round(totalCheckins / byDay.length) : 0;
  const busiestDay = byDay.reduce((b, d) => (d[1] > b[1] ? d : b), ['—', 0]);

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <AppShell>
      <div style={{ background: 'var(--bg-subtle)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(37,99,235,0.1))', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 4px 16px rgba(6,182,212,0.1)' }}>
            <Activity size={24} color="#0891b2" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Attendance Report</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Track member check-in patterns and peak traffic hours</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '7px 14px', border: '1px solid #d1d5db' }}>
            <Calendar size={14} color="#9ca3af" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', borderRadius: 10, padding: '7px 14px', border: '1px solid #d1d5db' }}>
            <Calendar size={14} color="#9ca3af" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 20 }}>{error}</div>}

        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Check-ins" value={totalCheckins} icon={<Users size={16} />} gradient="linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02))" />
          <KpiCard label="Peak Hour" value={peakHour.count > 0 ? `${peakHour.hour}:00` : '—'} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))" />
          <KpiCard label="Average Daily" value={avgDaily} icon={<TrendingUp size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))" />
          <KpiCard label="Busiest Day" value={busiestDay[0] !== '—' ? `${busiestDay[0]} (${busiestDay[1]})` : '—'} icon={<Calendar size={16} />} gradient="linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))" />
        </m.div>

        <m.div variants={containerVariants} initial="hidden" animate="visible">
          <m.div variants={itemVariants} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #06b6d4, #2563eb)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Check-ins by Hour</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <ArrowUpRight size={12} color="#0891b2" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2' }}>{totalCheckins} total</span>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 220, background: 'var(--bg-subtle)', borderRadius: 10 }} />
            ) : totalCheckins === 0 ? (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <BarChart3 size={24} color="#0891b2" />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-muted)' }}>No check-in data for this period</div>
                <div style={{ fontSize: 12, color: 'var(--text-disabled)', maxWidth: 300, textAlign: 'center' }}>Select a different date range to see attendance patterns.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                  {byHour.map((h, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 4 }}
                      onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                      {hovered === i && h.count > 0 && (
                        <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, background: 'rgba(6,182,212,0.9)', borderRadius: 6, padding: '3px 8px', marginBottom: 2, whiteSpace: 'nowrap' }}>
                          {h.count} check-ins
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 'auto', fontWeight: 600 }}>{hovered !== i ? (h.count > 0 ? h.count : '') : ''}</div>
                      <div style={{ width: '100%', height: `${Math.max((h.count / max) * 100, h.count > 0 ? 4 : 0)}%`, background: h.count > 0 ? 'linear-gradient(180deg, #06b6d4 0%, #2563eb 50%, rgba(37,99,235,0.3) 100%)' : '#f3f4f6', borderRadius: '6px 6px 0 0', minHeight: h.count > 0 ? 6 : 2, transition: 'height 0.4s, opacity 0.15s', opacity: hovered !== null && hovered !== i ? 0.5 : 1, boxShadow: h.count > 0 ? '0 2px 8px rgba(6,182,212,0.2)' : 'none' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {byHour.map((h, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, letterSpacing: '0.5px' }}>{h.hour}</div>
                  ))}
                </div>
              </>
            )}
          </m.div>
        </m.div>
      </div>
    </AppShell>
  );
}
