'use client';

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import {
  Users, TrendingUp, Clock, Zap, QrCode, ScanFace,
  User, Loader2, RefreshCw, Activity, CheckCircle2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

type Dashboard = Awaited<ReturnType<typeof api.qr.dashboard>>;

const HOUR_LABELS = ['12a','1','2','3','4','5','6','7','8','9','10','11','12p','1','2','3','4','5','6','7','8','9','10','11'];

const METHOD_ICONS: Record<string, React.ReactNode> = {
  face:      <ScanFace size={14} />,
  qr:        <QrCode size={14} />,
  manual:    <User size={14} />,
  biometric: <Zap size={14} />,
};

const METHOD_COLORS: Record<string, string> = {
  face: '#0067e0', qr: '#0067e0', manual: '#f59e0b', biometric: '#10b981',
};

const glass = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...glass, borderRadius: 16, padding: 20, borderLeft: `3px solid ${color}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {label}
          </div>
          <div style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          <Icon size={20} />
        </div>
      </div>
    </m.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const d = await api.qr.dashboard();
      setData(d);
      setLastRefresh(new Date());
    } catch { /* keep stale data on error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const hourly = data?.hourly ?? [];
  const maxHour = Math.max(1, ...hourly.map((h) => h.count));
  const hourMap: Record<number, number> = {};
  for (const h of hourly) hourMap[h.hour] = h.count;

  const weekly = data?.weekly_trend ?? [];
  const maxWeek = Math.max(1, ...weekly.map((w) => w.present));

  const methods = data?.method_breakdown ?? [];
  const totalMethods = Math.max(1, methods.reduce((s, m) => s + m.count, 0));

  const recentFeed = (data?.recent_checkins ?? []) as Array<{
    ref_name: string; check_in_time: string | null; method: string; ref_type: string;
  }>;

  const peakHour = hourly.length
    ? hourly.reduce((a, b) => (a.count >= b.count ? a : b)).hour
    : null;

  return (
    <Guard role="admin">
      <AppShell>
        {/* Hero */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#0067e0,#0059ce)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={22} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Attendance Dashboard</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  Live · Refreshes every 30s · Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              onClick={load} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <RefreshCw size={13} style={loading ? { animation: 'spin 0.9s linear infinite' } : {}} />
              Refresh
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 10 }}>
            <Loader2 size={20} style={{ animation: 'spin 0.9s linear infinite' }} /> Loading dashboard…
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
              <StatCard label="Currently Inside" value={data?.currently_inside.total ?? 0} sub="Active gym visitors right now" icon={Users} color="#10b981" />
              <StatCard label="Today's Check-ins" value={data?.today.total ?? 0} sub="Total across all types" icon={CheckCircle2} color="#0067e0" />
              <StatCard label="Members Inside" value={(data?.currently_inside.breakdown as Record<string, number> | undefined)?.client ?? 0} sub="Active member sessions" icon={User} color="#0067e0" />
              <StatCard
                label="Peak Hour"
                value={peakHour !== null ? HOUR_LABELS[peakHour] : '—'}
                sub="Busiest time today"
                icon={TrendingUp}
                color="#f59e0b"
              />
            </div>

            <div className="rg-sidebar" style={{ marginBottom: 16 }}>
              {/* Hourly bar chart */}
              <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color="#0067e0" /> Hourly Check-in Distribution — Today
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ minWidth: 420 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                      {Array.from({ length: 24 }, (_, h) => {
                        const count = hourMap[h] || 0;
                        const pct   = count / maxHour;
                        const isNow = new Date().getHours() === h;
                        return (
                          <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${HOUR_LABELS[h]}: ${count} check-ins`}>
                            <div style={{ fontSize: 9, color: count > 0 ? '#0067e0' : 'var(--text-disabled)', fontWeight: count > 0 ? 700 : 400 }}>{count || ''}</div>
                            <div style={{
                              width: '100%',
                              background: count > 0 ? `rgba(0,103,224,${0.15 + pct * 0.85})` : 'var(--bg-subtle)',
                              borderRadius: 3,
                              height: Math.max(4, pct * 60),
                              border: isNow ? '1px solid #0067e0' : 'none',
                              transition: 'height 0.4s ease',
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      {[0, 6, 12, 18, 23].map((h) => (
                        <span key={h} style={{ fontSize: 9, color: 'var(--text-disabled)' }}>{HOUR_LABELS[h]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Method breakdown */}
              <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={14} color="#f59e0b" /> Check-in Methods — Today
                </div>
                {methods.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No data yet</div>
                ) : methods.map((method) => {
                  const pct   = Math.round((method.count / totalMethods) * 100);
                  const color = METHOD_COLORS[method.method] || '#94a3b8';
                  return (
                    <div key={method.method} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          <span style={{ color }}>{METHOD_ICONS[method.method] || <User size={14} />}</span>
                          {method.method}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          {method.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                        <m.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{ height: '100%', background: color, borderRadius: 3 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rg-2" style={{ gap: 16 }}>
              {/* 7-day trend */}
              <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} color="#10b981" /> 7-Day Attendance Trend
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                  {weekly.map((w) => {
                    const pct     = w.present / maxWeek;
                    const label   = new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short' });
                    const isToday = w.date === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={w.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? '#10b981' : 'var(--text-muted)' }}>{w.present}</div>
                        <div style={{
                          width: '100%',
                          background: isToday ? '#10b981' : `rgba(16,185,129,${0.2 + pct * 0.6})`,
                          borderRadius: 4,
                          height: Math.max(6, pct * 60),
                          transition: 'height 0.4s ease',
                        }} />
                        <div style={{ fontSize: 9, color: isToday ? '#10b981' : 'var(--text-disabled)', fontWeight: isToday ? 700 : 400 }}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live feed */}
              <div style={{ ...glass, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px rgba(16,185,129,0.6)', animation: 'pulse 2s ease-in-out infinite' }} />
                  Live Check-in Feed
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {recentFeed.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No check-ins today yet</div>
                  ) : recentFeed.map((r, i) => {
                    const timeStr = r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const color   = METHOD_COLORS[r.method] || '#94a3b8';
                    return (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--border)' }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                          {r.ref_name?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ref_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color }}>{METHOD_ICONS[r.method] || <User size={10} />}</span>
                            {r.method} · {timeStr}
                          </div>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}25` }}>
                          {r.ref_type}
                        </span>
                      </m.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        `}</style>
      </AppShell>
    </Guard>
  );
}
