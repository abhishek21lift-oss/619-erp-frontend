'use client';
import { useEffect, useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { isCheckIn } from '@/lib/checkin';
import { CalendarRange } from 'lucide-react';
import { PageContainer, PageHero, PremiumBarChart, KpiCard } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { CanonicalDateRange } from '@/lib/insights/date-range';
import type { AttendanceMetric } from '@/lib/insights/metrics';

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
  // Canonical attendance (server-aggregated, unbounded) — the SAME dataset as
  // insights/traffic. Totals and the weekday chart read this; the row list
  // stays only as a fallback and must never feed a headline total.
  const canonical = useAsync<AttendanceMetric>(
    () => api.insights.attendance({ from, to, granularity: 'day' }) as Promise<AttendanceMetric>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to],
  );

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
    // Prefer the canonical server series (unbounded); fall back to the capped
    // row list only before it resolves.
    const series = canonical.data?.series;
    if (series && series.length > 0) {
      for (const s of series) {
        if (!s.date) continue;
        const dow = new Date(s.date.length <= 10 ? `${s.date}T00:00:00` : s.date).getDay();
        if (Number.isNaN(dow)) continue;
        counts[dow] += s.visits;
      }
    } else {
      for (const r of records) {
        if (!r.date) continue;
        if (!isCheckIn(r)) continue;
        counts[new Date(r.date).getDay()]++;
      }
    }
    return DAYS.map((d, i) => ({ day: d, count: counts[i] }));
  }, [records, canonical.data]);

  const total = canonical.data?.totals.visits ?? records.filter(isCheckIn).length;
  const avg = Math.round(total / Math.max(byDay.filter((d) => d.count > 0).length, 1));
  const busiest = byDay.reduce((b, d) => (d.count > b.count ? d : b), byDay[0]);

  return (
    <PageContainer>
      {/* This page had no title of any kind. It opened on a bare date range
          and three numbers, so the only way to know what you were looking at
          was to remember what you had tapped to get here. */}
      <PageHero
        icon={<CalendarRange size={20} />}
        title="Session Utilisation"
        subtitle="Which days of the week the studio actually fills up"
      >
        <CanonicalDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} dark />
      </PageHero>

      {(error || canonical.error) && (
        <div className="rounded-[12px] px-4 py-2.5 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
          {error || canonical.error?.message}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <KpiCard label="Total Check-ins" value={total} accent="blue" loading={canonical.loading && !canonical.data} />
        <KpiCard label="Avg Per Day" value={avg} accent="cyan" loading={canonical.loading && !canonical.data} />
        <KpiCard label="Busiest Day" value={busiest.count > 0 ? busiest.day : '—'} accent="emerald" loading={canonical.loading && !canonical.data} />
      </div>

      <div className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="mb-3 text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          Check-ins by day of week
        </h2>
        {loading ? (
          <div className="animate-pulse rounded-[12px]" style={{ height: 220, background: 'var(--bg-subtle)' }} />
        ) : (
          <PremiumBarChart
            data={byDay as Record<string, unknown>[]}
            xKey="day"
            bars={[{ key: 'count', label: 'Check-ins', color: '#10b981' }]}
            height={220}
          />
        )}
      </div>
    </PageContainer>
  );
}
