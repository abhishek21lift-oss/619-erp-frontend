'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }
};

function KpiCard({ label, value, icon, gradient }: {
  label: string; value: string | number; icon?: React.ReactNode; gradient: string
}) {
  return (
    <motion.div variants={itemVariants}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: '22px 20px', background: gradient, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(6,182,212,0.2)'; }}
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
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #0c2a3a 35%, #0f172a 65%, #0f0a1e 100%)', padding: '52px 32px 40px', borderRadius: '0 0 36px 36px' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 70, left: '30%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(6,182,212,0.35)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 30, right: '20%', width: 8, height: 8, borderRadius: '50%', background: 'rgba(37,99,235,0.3)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(37,99,235,0.2))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(6,182,212,0.15)' }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attendance Report</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Track member check-in patterns and peak traffic hours</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '7px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Calendar size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Check-ins" value={totalCheckins} icon={<Users size={16} />} gradient="linear-gradient(135deg, rgba(37,99,235,0.25), rgba(30,27,75,0.7))" />
          <KpiCard label="Peak Hour" value={peakHour.count > 0 ? `${peakHour.hour}:00` : '—'} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="Average Daily" value={avgDaily} icon={<TrendingUp size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.2), rgba(30,27,75,0.7))" />
          <KpiCard label="Busiest Day" value={busiestDay[0] !== '—' ? `${busiestDay[0]} (${busiestDay[1]})` : '—'} icon={<Calendar size={16} />} gradient="linear-gradient(135deg, rgba(124,58,237,0.2), rgba(30,27,75,0.7))" />
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '22px 20px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #06b6d4, #2563eb)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Check-ins by Hour</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <ArrowUpRight size={12} color="#22d3ee" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#22d3ee' }}>{totalCheckins} total</span>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 220, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />
            ) : totalCheckins === 0 ? (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <BarChart3 size={24} color="#22d3ee" />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>No check-in data for this period</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', maxWidth: 300, textAlign: 'center' }}>Select a different date range to see attendance patterns.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                  {byHour.map((h, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 4 }}
                      onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                      {hovered === i && h.count > 0 && (
                        <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, background: 'rgba(6,182,212,0.9)', borderRadius: 6, padding: '3px 8px', marginBottom: 2, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
                          {h.count} check-ins
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 'auto', fontWeight: 600 }}>{hovered !== i ? (h.count > 0 ? h.count : '') : ''}</div>
                      <div style={{ width: '100%', height: `${Math.max((h.count / max) * 100, h.count > 0 ? 4 : 0)}%`, background: h.count > 0 ? 'linear-gradient(180deg, #06b6d4 0%, #2563eb 50%, rgba(37,99,235,0.3) 100%)' : 'rgba(255,255,255,0.04)', borderRadius: '6px 6px 0 0', minHeight: h.count > 0 ? 6 : 2, transition: 'height 0.4s, opacity 0.15s', opacity: hovered !== null && hovered !== i ? 0.5 : 1, boxShadow: h.count > 0 ? '0 2px 8px rgba(6,182,212,0.3)' : 'none' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {byHour.map((h, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.5px' }}>{h.hour}</div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
}
