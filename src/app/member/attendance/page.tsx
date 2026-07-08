'use client';

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import {
  CalendarCheck, Flame, TrendingUp, Clock, QrCode,
  ScanFace, User, Loader2, ChevronLeft, ChevronRight,
  Download, Zap, RefreshCw,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

type History = Awaited<ReturnType<typeof api.qr.myHistory>>;

const METHOD_COLORS: Record<string, string> = {
  face: '#6366f1', qr: '#06b6d4', manual: '#f59e0b', biometric: '#10b981',
};
const METHOD_ICONS: Record<string, React.ReactNode> = {
  face:      <ScanFace size={12} />,
  qr:        <QrCode size={12} />,
  manual:    <User size={12} />,
  biometric: <Zap size={12} />,
};

const glass = { background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' } as const;

function StatPill({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div style={{ ...glass, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

// Simple calendar heatmap for a month
function MonthCalendar({ year, month, presentDays }: { year: number; month: number; presentDays: Set<string> }) {
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {dayNames.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((c, i) => {
          if (!c.day || !c.dateStr) return <div key={i} />;
          const isPresent = presentDays.has(c.dateStr);
          const isToday   = c.dateStr === todayStr;
          const isFuture  = c.dateStr > todayStr;
          return (
            <div
              key={i}
              title={c.dateStr + (isPresent ? ' ✓' : '')}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: isPresent ? 700 : 400,
                background: isPresent ? '#10b981' : isFuture ? 'transparent' : '#f3f4f6',
                color: isPresent ? '#fff' : isToday ? '#6366f1' : isFuture ? '#9ca3af' : '#6b7280',
                border: isToday ? '2px solid #6366f1' : '2px solid transparent',
                cursor: 'default',
              }}
            >
              {c.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemberAttendancePage() {
  const [data,    setData]    = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(() => new Date());
  const [qrDataUrl, setQrDataUrl]   = useState<string | null>(null);
  const [qrLoading, setQrLoading]   = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.qr.myHistory(200);
      setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await api.qr.generate({ dynamic: false });
      setQrDataUrl(res.dataUrl);
    } catch { /* ignore */ }
    finally { setQrLoading(false); }
  }, []);

  useEffect(() => { loadQr(); }, [loadQr]);

  const history = data?.history ?? [];
  const stats   = data?.stats;

  // Build set of dates present
  const presentDays = new Set<string>();
  for (const row of history) {
    if (row.check_in_time) presentDays.add(String(row.check_in_time).slice(0, 10));
  }

  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const prevMonth = () => setCalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthName = calDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const daysThisMonth = history.filter((r) => {
    const dateStr = String(r.check_in_time).slice(0, 7);
    return dateStr === `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  }).length;

  return (
    <Guard>
      <AppShell>
        {/* Header */}
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 16, padding: '18px 22px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>My Attendance</h1>
              <p style={{ fontSize: 11, color: 'var(--text-disabled)', margin: '2px 0 0' }}>Your gym visit history and streaks</p>
            </div>
          </div>
        </div>

        {/* QR code card */}
        <div style={{ ...glass, borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flexShrink: 0 }}>
            {qrLoading ? (
              <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <Loader2 size={24} style={{ animation: 'spin 0.9s linear infinite', color: 'var(--text-muted)' }} />
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Your check-in QR code" style={{ width: 120, height: 120, borderRadius: 10, display: 'block' }} />
            ) : (
              <div style={{ width: 120, height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', borderRadius: 10, color: 'var(--text-muted)', gap: 6 }}>
                <QrCode size={28} />
                <span style={{ fontSize: 10 }}>Unavailable</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={16} color="#06b6d4" /> Your Check-in QR Code
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Show this QR at the gym entrance or kiosk to check in. Your static QR code never expires — you can print it too.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download="my-checkin-qr.png"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#06b6d4,#0284c7)', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Download size={12} /> Download
                </a>
              )}
              <button
                onClick={loadQr}
                disabled={qrLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                <RefreshCw size={11} style={qrLoading ? { animation: 'spin 0.9s linear infinite' } : {}} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60, color: 'var(--text-muted)' }}>
            <Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> Loading your attendance…
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatPill label="Total Visits" value={stats?.total_present ?? 0} icon={CalendarCheck} color="#10b981" />
              <StatPill label="Current Streak" value={`${stats?.current_streak ?? 0}d`} icon={Flame} color="#ef4444" />
              <StatPill label="Best Streak" value={`${stats?.longest_streak ?? 0}d`} icon={TrendingUp} color="#f59e0b" />
              <StatPill label="This Month" value={stats?.this_month ?? 0} icon={Clock} color="#6366f1" />
              <StatPill label="Attendance Rate" value={`${stats?.attendance_rate ?? 0}%`} icon={TrendingUp} color="#8b5cf6" />
              {(stats?.avg_duration_minutes ?? 0) > 0 && (
                <StatPill label="Avg Session" value={`${stats?.avg_duration_minutes}m`} icon={Clock} color="#06b6d4" />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
              {/* Calendar */}
              <div style={{ ...glass, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{monthName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{daysThisMonth} visits</div>
                  </div>
                  <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <MonthCalendar year={calYear} month={calMonth} presentDays={presentDays} />
                {/* Legend */}
                <div style={{ display: 'flex', gap: 12, marginTop: 14, fontSize: 10, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} /> Present
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} /> Absent
                  </div>
                </div>
              </div>

              {/* Visit log */}
              <div style={{ ...glass, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Visit History</div>
                  <button
                    title="Export CSV"
                    onClick={() => {
                      const rows = [['Date', 'Check-in', 'Check-out', 'Duration (min)', 'Method']];
                      for (const r of history) {
                        rows.push([
                          String(r.check_in_time).slice(0, 10),
                          r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN') : '',
                          r.check_out_time ? new Date(r.check_out_time as string).toLocaleTimeString('en-IN') : '',
                          String(r.duration_minutes ?? ''),
                          r.method ?? '',
                        ]);
                      }
                      const csv  = rows.map((r) => r.join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const a    = document.createElement('a');
                      a.href     = URL.createObjectURL(blob);
                      a.download = 'attendance.csv';
                      a.click();
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    <Download size={12} /> Export CSV
                  </button>
                </div>
                <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                  {history.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No visits recorded yet</div>
                  ) : history.map((r, i) => {
                    const date      = r.check_in_time ? new Date(r.check_in_time) : null;
                    const checkOut  = r.check_out_time ? new Date(r.check_out_time as string) : null;
                    const color     = METHOD_COLORS[r.method ?? ''] || '#94a3b8';
                    return (
                      <m.div
                        key={i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}
                      >
                        <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {date ? date.getDate() : '?'}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {date ? date.toLocaleDateString('en-IN', { month: 'short' }) : ''}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {date ? date.toLocaleDateString('en-IN', { weekday: 'long' }) : 'Unknown'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>
                              In: {date ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                            {checkOut && (
                              <span>Out: {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                            {r.duration_minutes && (
                              <span style={{ color: '#10b981', fontWeight: 700 }}>{r.duration_minutes}m</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color, background: `${color}12`, padding: '3px 8px', borderRadius: 20, border: `1px solid ${color}20`, textTransform: 'capitalize', flexShrink: 0 }}>
                          {METHOD_ICONS[r.method ?? ''] || <User size={11} />}
                          {r.method ?? 'manual'}
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </AppShell>
    </Guard>
  );
}
