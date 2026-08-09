'use client';
import { useEffect, useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { CalendarRange } from 'lucide-react';
import { PageContainer, PageHero, PremiumBarChart } from '@/components/ui';

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
    <PageContainer>
      {/* This page had no title of any kind. It opened on a bare date range
          and three numbers, so the only way to know what you were looking at
          was to remember what you had tapped to get here. */}
      <PageHero
        icon={<CalendarRange size={20} />}
        title="Session Utilisation"
        subtitle="Which days of the week the studio actually fills up"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <HeroDate label="From" value={from} max={to} onChange={setFrom} />
          <HeroDate label="To" value={to} min={from} max={today} onChange={setTo} />
        </div>
      </PageHero>

      {error && (
        <div className="rounded-[12px] px-4 py-2.5 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Total Check-ins" value={total} color="var(--brand)" />
        <Stat label="Avg Per Day" value={avg} color="var(--brand)" />
        <Stat label="Busiest Day" value={busiest.count > 0 ? busiest.day : '—'} color="var(--success)" />
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

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-[16px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="text-[22px] font-[800] tabular-nums leading-none tracking-[-0.03em]" style={{ color }}>{value}</div>
      <div className="mt-1.5 text-[10px] font-[800] uppercase leading-tight tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

/** A date field on the hero's dark surface — see the twin in insights/traffic. */
function HeroDate({
  label, value, min, max, onChange,
}: { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10.5px] font-[800] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.66)' }}>
        {label}
      </span>
      <input
        type="date" value={value} min={min} max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] w-full min-w-0 rounded-[12px] px-3 text-[13px] font-[600] text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }}
      />
    </label>
  );
}
