'use client';
import { useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import { RefreshCcw, Users, AlertTriangle, CalendarClock, Percent, Clock, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';
import { PageContainer, PageHero, KpiCard } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { CanonicalDateRange, isoDaysAgo, isoToday } from '@/lib/insights/date-range';
import { fmtRate, type RenewalMetric } from '@/lib/insights/metrics';

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
  // TRUE renewal conversion window. Same {from,to} feeds the conversion AND
  // the pipeline counts, so the KPI and the table cannot disagree.
  const [from, setFrom] = useState(() => isoDaysAgo(90));
  const [to, setTo] = useState(() => isoToday());

  const renewals = useAsync<RenewalMetric>(
    () => api.insights.renewals({ from, to }) as Promise<RenewalMetric>,
    [from, to],
  );
  const rows = useAsync<Array<{ id: string; name: string; package_type?: string | null; trainer_name?: string | null; pt_end_date?: string | null; days_left: number }>>(
    () => api.insights.renewalRows({ days: 30, limit: 100 }) as Promise<Array<{ id: string; name: string; package_type?: string | null; trainer_name?: string | null; pt_end_date?: string | null; days_left: number }>>,
    [],
  );

  const m = renewals.data;
  const loading = renewals.loading || rows.loading;
  const error = renewals.error?.message || rows.error?.message || '';
  const upcoming = useMemo(() => [...(rows.data ?? [])].sort((a, b) => a.days_left - b.days_left), [rows.data]);

  return (
    <PageContainer>
      <PageHero
        icon={<RefreshCcw size={20} />}
        title="Renewal Report"
        subtitle="TRUE renewal conversion — renewed packages over expired packages in the same window"
      >
        <CanonicalDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} dark />
      </PageHero>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error}</div>}

      {/* Canonical KPIs — server-computed. renewal_rate is TRUE conversion
          (null = no expiries in window, rendered as em dash, never 0%).
          active_share_pct is a snapshot and is labelled as such. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Renewal Rate" value={fmtRate(m?.renewal_rate)} hint={m ? `${m.renewed_of_cohort} of ${m.expired_cohort} renewed` : undefined} icon={<Percent size={16} />} accent="emerald" loading={renewals.loading} />
        <KpiCard label="Expiring in 7 Days" value={m?.expiring_7d ?? '—'} icon={<AlertTriangle size={16} />} accent="coral" loading={renewals.loading} />
        <KpiCard label="Expiring in 30 Days" value={m?.expiring_30d ?? '—'} icon={<CalendarClock size={16} />} accent="amber" loading={renewals.loading} />
        <KpiCard label="Active Share" value={fmtRate(m?.active_share_pct)} hint="Snapshot — not conversion" icon={<Users size={16} />} accent="blue" loading={renewals.loading} />
      </div>
      {m && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Window {m.from} → {m.to}: {m.expired_cohort} expired, {m.renewed_in_period} renewal transactions
          {m.renewal_revenue > 0 && <> · {fmtMoney(m.renewal_revenue)} renewal revenue</>} · {m.active} active / {m.expired} expired now.
        </div>
      )}

      <div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #0067e0, #0059ce)', display: 'inline-block' }} />
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
                    const days = c.days_left;
                    const daysColor = days <= 7 ? '#ef4444' : days <= 14 ? '#f59e0b' : '#10b981';
                    const daysBg = days <= 7 ? 'rgba(239,68,68,0.08)' : days <= 14 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
                    return (
                      <tr key={c.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', background: i % 2 === 0 ? 'var(--bg-subtle)' : 'var(--bg-card)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,103,224,0.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-subtle)' : 'var(--bg-card)'; }}>
                        <td style={{ ...td, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                        <td style={{ ...td }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(0,103,224,0.08)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.12)' }}>{c.package_type || '—'}</span>
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
        </div>
      </div>
    </PageContainer>
  );
}
