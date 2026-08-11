'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { Activity, Users, Clock, TrendingUp, Calendar, BarChart3, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { isCheckIn } from '@/lib/checkin';
import { scrollIndexIntoCentre } from '@/lib/chart-scroll';
import { PageContainer, PageHero } from '@/components/ui';

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
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,103,224,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>{label}</span>
        {icon && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)', color: '#0059ce' }}>
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

  // -- One population, three aggregations --------------------------------
  //
  // This page used to count three different things and present them as one
  // report: byHour took rows that had a check_in time, byDay took rows that
  // had a date, and the "Total Check-ins" KPI took `records.length` -- every
  // row returned, including the 'absent' and 'excused' ones that exist for
  // the same member on the same day and mean the opposite of a visit.
  //
  // So the KPI was inflated, it did not match either chart beneath it, and it
  // did not match the identical KPI on insights/sessions, which had the rule
  // right. All of them now read the same filtered list. See checkin.ts.
  const visits = useMemo(() => records.filter(isCheckIn), [records]);

  const byHour = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of visits) {
      if (!r.check_in) continue;
      const h = String(r.check_in).slice(0, 2);
      map.set(h, (map.get(h) || 0) + 1);
    }
    return HOURS.map((h) => ({ hour: h, count: map.get(h) || 0 }));
  }, [visits]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of visits) {
      if (!r.date) continue;
      map.set(r.date, (map.get(r.date) || 0) + 1);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
  }, [visits]);

  const max = Math.max(...byHour.map((h) => h.count), 1);
  const totalCheckins = visits.length;
  const peakHour = byHour.reduce((b, h) => (h.count > b.count ? h : b), byHour[0]);
  const avgDaily = byDay.length > 0 ? Math.round(totalCheckins / byDay.length) : 0;
  const busiestDay = byDay.reduce((b, d) => (d[1] > b[1] ? d : b), ['—', 0]);

  const [hovered, setHovered] = useState<number | null>(null);

  // ── Open the hour chart on the hour that matters ──────────────────────
  //
  // The chart is 17 hours wide inside a card that is ~350px on a phone, so it
  // scrolls horizontally (squeezing 17 bars into 350px gives each one 14px,
  // narrower than the hour label under it). It opened at 06:00 — the quietest
  // hour of the day, in a gym — so the peak the KPI card names sat off-screen
  // and had to be hunted for.
  //
  // Three constraints shape this, all of which rule out the obvious version:
  //
  //  · No layout shift. This runs in useLayoutEffect and writes scrollLeft
  //    directly, so the position is already correct at first paint: nothing
  //    animates and nothing moves. scrollIntoView is deliberately NOT used —
  //    it scrolls ancestors too, which would jump the whole page vertically.
  //  · Never fight the user. Any pointer, wheel, touch or key interaction with
  //    the scroller latches userScrolled and this stops for that dataset.
  //    Those events are chosen because they cannot be produced by writing
  //    scrollLeft, unlike the scroll event, which fires for our own write and
  //    would make this immediately think it had been overridden.
  //  · Once per dataset. positionedFor pins the key; changing the date range
  //    is the user asking for different data, so that re-arms it.
  const chartScroller = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(false);
  const positionedFor = useRef<string | null>(null);

  const peakIndex = byHour.reduce((best, h, i) => (h.count > byHour[best].count ? i : best), 0);

  useLayoutEffect(() => {
    const el = chartScroller.current;
    if (!el || loading || totalCheckins === 0) return;

    const key = `${from}|${to}|${peakIndex}`;
    if (positionedFor.current === key) return;
    // A new range re-arms it, including after the user had scrolled the last one.
    if (positionedFor.current !== null && !positionedFor.current.startsWith(`${from}|${to}|`)) {
      userScrolled.current = false;
    }
    if (userScrolled.current) return;
    positionedFor.current = key;

    scrollIndexIntoCentre(el, peakIndex);
  }, [loading, totalCheckins, peakIndex, from, to]);

  const stopAutoScroll = () => { userScrolled.current = true; };

  return (
    <PageContainer>
      <PageHero
        icon={<Activity size={20} />}
        title="Attendance Report"
        subtitle="Track member check-in patterns and peak traffic hours"
      >
        {/* Two equal columns that cannot outgrow the hero. The old pair was
            a flex row of intrinsically-sized pills — icon, label and a date
            input each sized to their own content — so on a phone the "To"
            field simply ran off the right edge of the screen. */}
        <div className="grid grid-cols-2 gap-2.5">
          <DateField label="From" value={from} max={to} onChange={setFrom} />
          <DateField label="To" value={to} min={from} onChange={setTo} />
        </div>
      </PageHero>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#dc2626' }}>{error}</div>}

      <m.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total Check-ins" value={totalCheckins} icon={<Users size={16} />} gradient="linear-gradient(135deg, rgba(0,103,224,0.08), rgba(0,103,224,0.02))" />
        <KpiCard label="Peak Hour" value={peakHour.count > 0 ? `${peakHour.hour}:00` : '—'} icon={<Clock size={16} />} gradient="linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))" />
        <KpiCard label="Average Daily" value={avgDaily} icon={<TrendingUp size={16} />} gradient="linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))" />
        <KpiCard label="Busiest Day" value={busiestDay[0] !== '—' ? `${busiestDay[0]} (${busiestDay[1]})` : '—'} icon={<Calendar size={16} />} gradient="linear-gradient(135deg, rgba(0,103,224,0.08), rgba(0,103,224,0.02))" />
      </m.div>

      <m.div variants={containerVariants} initial="hidden" animate="visible">
        <m.div variants={itemVariants} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg, #0067e0, #0059ce)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Check-ins by Hour</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,103,224,0.08)', border: '1px solid rgba(0,103,224,0.15)' }}>
              <ArrowUpRight size={12} color="#0059ce" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0059ce' }}>{totalCheckins} total</span>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 220, background: 'var(--bg-subtle)', borderRadius: 10 }} />
          ) : totalCheckins === 0 ? (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,103,224,0.15)' }}>
                <BarChart3 size={24} color="#0059ce" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-muted)' }}>No check-in data for this period</div>
              <div style={{ fontSize: 12, color: 'var(--text-disabled)', maxWidth: 300, textAlign: 'center' }}>Select a different date range to see attendance patterns.</div>
            </div>
          ) : (
            /* Seventeen bars will not fit a 390px card — that is 14px each,
               narrower than the hour label under them. The chart scrolls
               inside its own card rather than squeezing, so the page body
               never scrolls sideways. */
            <div
              ref={chartScroller}
              className="-mx-1 overflow-x-auto px-1"
              onPointerDown={stopAutoScroll}
              onWheel={stopAutoScroll}
              onTouchStart={stopAutoScroll}
              onKeyDown={stopAutoScroll}
            >
              <div className="min-w-[520px]">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                {byHour.map((h, i) => (
                  <div key={i} data-hour-index={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 4 }}
                    onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                    {hovered === i && h.count > 0 && (
                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, background: 'rgba(0,103,224,0.9)', borderRadius: 6, padding: '3px 8px', marginBottom: 2, whiteSpace: 'nowrap' }}>
                        {h.count} check-ins
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 'auto', fontWeight: 600 }}>{hovered !== i ? (h.count > 0 ? h.count : '') : ''}</div>
                    <div style={{ width: '100%', height: `${Math.max((h.count / max) * 100, h.count > 0 ? 4 : 0)}%`, background: h.count > 0 ? 'linear-gradient(180deg, #0067e0 0%, #0059ce 50%, rgba(0,103,224,0.3) 100%)' : '#f1f5f9', borderRadius: '6px 6px 0 0', minHeight: h.count > 0 ? 6 : 2, transition: 'height 0.4s, opacity 0.15s', opacity: hovered !== null && hovered !== i ? 0.5 : 1, boxShadow: h.count > 0 ? '0 2px 8px rgba(0,103,224,0.2)' : 'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {byHour.map((h, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, letterSpacing: '0.5px' }}>{h.hour}</div>
                ))}
              </div>
              </div>
            </div>
          )}
        </m.div>
      </m.div>
    </PageContainer>
  );
}

/**
 * A labelled date field that cannot outgrow its column.
 *
 * `<input type="date">` sizes itself to its own content and ignores the width
 * of whatever it is in, which is how the "To" field ended up off the right of
 * the screen. `w-full` plus `min-w-0` on a grid child is the fix.
 */
function DateField({
  label, value, min, max, onChange,
}: { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10.5px] font-[800] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.66)' }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-[44px] w-full min-w-0 rounded-[12px] px-3 text-[13px] font-[600] text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }}
      />
    </label>
  );
}
