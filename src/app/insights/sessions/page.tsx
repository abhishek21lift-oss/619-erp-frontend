'use client';
import { useEffect, useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { PremiumBarChart } from '@/components/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SessionUtilisationPage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  })();

  const [from, setFrom] = useState(monthAgo);
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
    return () => {
      alive = false;
    };
  }, [from, to]);

  const byDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const r of records) {
      if (!r.date) continue;
      if (r.status !== 'present' && r.status !== 'late') continue;
      counts[new Date(r.date).getDay()]++;
    }
    return DAYS.map((d, i) => ({ day: d, count: counts[i] }));
  }, [records]);

  const total = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const avg = Math.round(total / Math.max(byDay.filter((d) => d.count > 0).length, 1));
  const busiest = byDay.reduce((b, d) => (d.count > b.count ? d : b), byDay[0]);

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="kpi-grid mb-3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <Stat label="Total Check-ins" value={total} color="var(--brand)" />
            <Stat label="Avg Per Day" value={avg} color="var(--info)" />
            <Stat label="Busiest Day" value={busiest.count > 0 ? busiest.day : '—'} color="var(--success)" />
          </div>

          <div className="card">
            <div className="card-title">Check-ins by day of week</div>
            {loading ? (
              <div style={{ height: 220, background: 'var(--bg-subtle)', borderRadius: 10 }} />
            ) : (
              <PremiumBarChart
                data={byDay as Record<string, unknown>[]}
                xKey="day"
                bars={[{ key: 'count', label: 'Check-ins', color: '#10b981' }]}
                height={220}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em' }} className="tabular">{value}</div>
      <div className="text-muted" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
