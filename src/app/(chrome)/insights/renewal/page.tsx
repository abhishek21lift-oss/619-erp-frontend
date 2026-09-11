'use client';
import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { RefreshCcw, Users, AlertTriangle, CalendarClock, Percent, Clock, UserCheck } from 'lucide-react';
import { api, Client, InsightsSummary } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { PageContainer, PageHero } from '@/components/ui';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } }
};

function KpiCard({ label, value, icon, gradient, hint }: {
  label: string; value: string | number; icon?: React.ReactNode; gradient: string;
  /** The figure's own denominator or caveat. A rate without one is a claim
   *  without evidence — 100% of one term reads identically to 100% of forty. */
  hint?: string;
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
      {hint && (
        <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.35, color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
          {hint}
        </div>
      )}
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

/** Days from today to a date, or null when there is no date. */
function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The renewal rate is fetched, not derived.
  //
  // It used to be computed here as active / (active + expired) over whatever
  // api.clients.list returned — a ratio of two current status counts, with no
  // window, presented as a renewal rate. It measured the wrong thing in three
  // separate ways: it read `status`, a hand-maintained string that disagrees
  // with the client's own pt_end_date for roughly a third of live clients; it
  // had no period, so it could not answer "renewal rate this quarter"; and as
  // a stock ratio it cannot fall below 50% while a studio keeps enrolling,
  // because every new client lands in the numerator.
  //
  // On production it read 50% for a studio whose true conversion was 0%.
  //
  // /api/insights/summary computes the real thing — of the terms that reached
  // their end date in the window, how many were renewed — in SQL, over the
  // whole population, scoped to this studio. The client list below is still
  // fetched, but only to LIST who is up for renewal; no figure is derived
  // from it.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.insights.summary().catch((e) => { if (alive) setError(e.message); return null; }),
      api.clients.list({}).catch((e) => { if (alive) setError(e.message); return []; }),
    ])
      .then(([s, cs]) => {
        if (!alive) return;
        if (s) setSummary(s.data);
        setClients(cs);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Expiry counts come from the same date the table below sorts on, so the
  // tiles and the rows can never disagree about who is expiring. The server's
  // active/lapsed counts are shown as they are.
  const expiring = useMemo(() => {
    const within = (limit: number) => clients.filter((c) => {
      const d = daysUntil(c.pt_end_date);
      return d !== null && d >= 0 && d <= limit;
    }).length;
    return { in7: within(7), in30: within(30) };
  }, [clients]);

  const upcoming = useMemo(() => (
    clients
      .filter((c) => {
        const d = daysUntil(c.pt_end_date);
        return d !== null && d >= 0 && d <= 30;
      })
      .sort((a, b) => new Date(a.pt_end_date!).getTime() - new Date(b.pt_end_date!).getTime())
  ), [clients]);

  return (
    <PageContainer>
      <PageHero
        icon={<RefreshCcw size={20} />}
        title="Renewal Report"
        subtitle="Monitor membership renewals and upcoming expirations"
      />

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#ef4444' }}>{error}</div>}

      {/* Two up on a phone. `minmax(150px, 1fr)` auto-fit gave one full-width
          tile per row at 390px, so four numbers took four screenfuls of
          scrolling to read — the whole point of a KPI row is that you take
          it in at once. */}
      <m.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active Members" value={summary ? summary.active_clients : '—'} icon={<Users size={16} />} gradient="linear-gradient(135deg, #ecfdf5, #fff)" />
        <KpiCard label="Expiring in 7 Days" value={expiring.in7} icon={<AlertTriangle size={16} />} gradient="linear-gradient(135deg, #fef2f2, #fff)" />
        <KpiCard label="Expiring in 30 Days" value={expiring.in30} icon={<CalendarClock size={16} />} gradient="linear-gradient(135deg, #fffbeb, #fff)" />
        {/* Null is rendered as "—", never as 0%. Null means no term came up
            for renewal in the window, which is not the same fact as every
            client having left, and the two must not look alike. The
            denominator is shown beside the rate so a 100% built on one term
            cannot be mistaken for a 100% built on forty. */}
        <KpiCard
          label="Renewal Rate"
          value={summary?.renewal_rate_pct === null || summary?.renewal_rate_pct === undefined
            ? '—'
            : `${summary.renewal_rate_pct}%`}
          hint={summary && summary.terms_due > 0
            ? `${summary.terms_renewed} of ${summary.terms_due} terms renewed · last 30 days`
            : 'No terms came up for renewal in the last 30 days'}
          icon={<Percent size={16} />}
          gradient="linear-gradient(135deg, #f1f5f9, #fff)"
        />
      </m.div>

      <m.div variants={containerVariants} initial="hidden" animate="visible">
        <m.div variants={itemVariants} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', background: 'var(--bg-card)' }}>
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
                    const days = Math.ceil((new Date(c.pt_end_date!).getTime() - Date.now()) / 86400000);
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
        </m.div>
      </m.div>
    </PageContainer>
  );
}
