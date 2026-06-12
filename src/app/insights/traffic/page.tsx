'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Activity, Users, Clock, TrendingUp, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

const HOURS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];

function fadeUp(i: number) {
  return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const } };
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

  return (
    <AppShell>
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '48px 32px 40px', borderRadius: '0 0 32px 32px' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1), transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Attendance Report</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Track member check-in patterns and peak traffic hours</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, outline: 'none', padding: '2px 0' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</div>}

        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} {...fadeUp(0)}>
          {[
            { label: 'Total Check-ins', value: totalCheckins, icon: <Users size={16} />, color: '#3b82f6' },
            { label: 'Peak Hour', value: peakHour.count > 0 ? `${peakHour.hour}:00` : '—', icon: <Clock size={16} />, color: '#f59e0b' },
            { label: 'Average Daily', value: avgDaily, icon: <TrendingUp size={16} />, color: '#10b981' },
            { label: 'Busiest Day', value: busiestDay[0] !== '—' ? `${busiestDay[0]} (${busiestDay[1]})` : '—', icon: <Calendar size={16} />, color: '#8b5cf6' },
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

        <motion.div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 20px 16px' }} {...fadeUp(5)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={16} color="rgba(255,255,255,0.6)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Check-ins by Hour</span>
          </div>
          {loading ? (
            <div style={{ height: 160, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                {byHour.map((h, i) => (
                  <div key={i} title={`${h.hour}:00 — ${h.count} check-ins`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 4 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 'auto', fontWeight: 600 }}>{h.count > 0 ? h.count : ''}</div>
                    <div style={{ width: '100%', height: `${Math.max((h.count / max) * 100, h.count > 0 ? 4 : 0)}%`, background: h.count > 0 ? 'linear-gradient(180deg, #06b6d4, rgba(6,182,212,0.3))' : 'rgba(255,255,255,0.04)', borderRadius: '6px 6px 0 0', minHeight: h.count > 0 ? 6 : 2, transition: 'height 0.4s' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {byHour.map((h, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.5px' }}>{h.hour}</div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
