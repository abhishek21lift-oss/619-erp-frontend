'use client';

// The studio's client receivables.
//
// ── What this page is, and is not ───────────────────────────────────────────
//
// The product keeps no ledger: there are no asset, liability or equity
// accounts. What it does keep, per PT client, is the current term's fee
// (`final_amount`), a lifetime payments total (`paid_amount`) and a stored
// balance (`balance_amount`). Only the first is this page's accounting
// category — receivables — and the body is organised around it rather than
// around headings the data cannot fill.
//
// ── Two figures that look comparable and are not ────────────────────────────
//
// `final_amount` is the CURRENT term's fee. `paid_amount` is LIFETIME paid —
// every payment path adds to it and renewal never resets it. The old header
// derived a "Collection Rate" from their ratio, which can exceed 100% for any
// client who has renewed, and the stored balance subtracts one from the other
// across periods. The page now labels each period and does not divide them;
// see the note above `getBalanceSheet` in the backend for the canonical
// current-term balance, which the dues aggregates do not yet use.
//
// The table still shows the stored balance because that is what every finance
// screen and reminder reads. Changing it here alone would make this page and
// Outstanding Dues disagree.

import { useState, useMemo, useEffect } from 'react';
import { m } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, CheckCircle, Search, Download, Users, Clock, ChevronRight, X, RefreshCw } from 'lucide-react';
import Guard from '@/components/Guard';
import Link from 'next/link';
import { PageContainer, PageHero, PullToRefresh, KpiCard } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api, PtClientBase } from '@/lib/api';

type BalanceItem = PtClientBase & {
  due_status: string;
  monthly_pt_amount: number;
  trainer_commission: number;
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const asOfLabel = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function DueBadge({ status }: { status: string }) {
  const overdue = status === 'OVERDUE';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 20,
      background: overdue ? 'rgba(220,38,38,0.10)' : 'rgba(245,158,11,0.12)',
      color: overdue ? '#dc2626' : '#b45309',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: overdue ? '#dc2626' : '#f59e0b', display: 'inline-block' }} />
      {overdue ? 'Overdue' : 'Due'}
    </span>
  );
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } } };

function exportCSV(rows: BalanceItem[]) {
  const headers = ['Name', 'Mobile', 'Trainer', 'Package', 'Final Amount', 'Paid Amount', 'Balance', 'Status', 'Days Left', 'PT End Date'];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.name, r.mobile ?? '', r.trainer_name ?? '', r.package_type ?? '',
      Number(r.final_amount), Number(r.paid_amount), Number(r.balance_amount),
      r.due_status, r.days_left ?? '', r.pt_end_date ?? '',
    ].map(escape).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const dayLabel = (daysLeft: number | null | undefined) => {
  if (daysLeft === null || daysLeft === undefined) return '—';
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Last day';
  return `${daysLeft}d`;
};

export default function BalanceSheetPage() {
  const bs = useAsync<{ data: BalanceItem[]; total: number; total_outstanding: number }>(
    () => api.pt.balanceSheet().then((r) => r as { data: BalanceItem[]; total: number; total_outstanding: number }),
    [],
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OVERDUE' | 'DUE'>('ALL');

  // Client-side to avoid a server/client date mismatch. The label is the page
  // load time; the endpoint has no reporting-period parameter.
  const [asOf, setAsOf] = useState<Date | null>(null);
  useEffect(() => { setAsOf(new Date()); }, []);

  const items = useMemo(() => bs.data?.data ?? [], [bs.data]);

  // Only clients who still owe something ever appear on this page — a
  // cleared client has nothing here to act on.
  const duesOnly = useMemo(() => items.filter(i => Number(i.balance_amount) > 0), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return duesOnly.filter(i => {
      const matchQ = !q || i.name.toLowerCase().includes(q) || (i.mobile || '').includes(q) || (i.trainer_name || '').toLowerCase().includes(q);
      const matchF = filter === 'ALL' || i.due_status === filter;
      return matchQ && matchF;
    });
  }, [duesOnly, search, filter]);

  // Receivables are the one accounting category the data supports. Outstanding
  // is the stored per-client balance, not a fresh subtraction of the two
  // lifetime/current-term totals below.
  const unavailable = !!bs.error && !bs.data;
  const totalOutstanding = items.reduce((s, i) => s + Number(i.balance_amount), 0);
  const overdueCount = duesOnly.filter(i => i.due_status === 'OVERDUE').length;
  const averageBalance = duesOnly.length > 0 ? Math.round(totalOutstanding / duesOnly.length) : 0;

  // Period totals, labelled separately and never divided into a rate.
  const totalBilled = items.reduce((s, i) => s + Number(i.final_amount), 0);
  const totalPaid = items.reduce((s, i) => s + Number(i.paid_amount), 0);

  const refresh = () => {
    setAsOf(new Date());
    return bs.refetch();
  };

  return (
    <Guard role="trainer">
      <PullToRefresh onRefresh={refresh}>
      <PageContainer>

        {/* ── Hero ──
            maxWidth 1280 with 20px of its own padding INSIDE .shell-main's
            gutter, and then a further 40px on the header block — so the
            title sat 76px from the screen edge on a phone where the
            dashboard sits at 16. */}
        <PageHero
          icon={<Wallet size={20} />}
          title="Balance Sheet"

          // The debtors alone, with risk bands and WhatsApp reminders, are
          // Outstanding Dues.
          actions={
          <Link href="/finance/dues"
            className="inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[12px] font-semibold transition active:scale-95"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
            Who owes <ChevronRight size={13} aria-hidden />
          </Link>}
        >
          {overdueCount > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[700]"
                style={{ background: 'rgba(248,113,113,0.22)', border: '1px solid rgba(248,113,113,0.35)', color: '#FECACA' }}>
                <AlertCircle size={13} /> {overdueCount} overdue
              </span>
            </div>
          )}
        </PageHero>

        {/* ── Receivables ── */}
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Receivables
            </h2>
            {asOf && (
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                From current PT client records · as of {asOfLabel(asOf)}
              </p>
            )}
          </div>
        </div>

        <m.div variants={containerVariants} initial="hidden" animate="visible"
          className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <m.div variants={itemVariants}>
            <KpiCard
              label="Outstanding"
              value={unavailable ? '—' : fmtINR(totalOutstanding)}
              hint="Stored client balances"
              icon={<AlertCircle size={18} />}
              accent="coral"
              loading={bs.loading && !bs.data}
            />
          </m.div>
          <m.div variants={itemVariants}>
            <KpiCard
              label="Clients with dues"
              value={unavailable ? '—' : String(duesOnly.length)}
              hint="Balance above ₹0"
              icon={<Users size={18} />}
              accent="blue"
              loading={bs.loading && !bs.data}
            />
          </m.div>
          <m.div variants={itemVariants}>
            <KpiCard
              label="Overdue"
              value={unavailable ? '—' : String(overdueCount)}
              hint="Past the PT end date"
              icon={<Clock size={18} />}
              accent="amber"
              loading={bs.loading && !bs.data}
            />
          </m.div>
          <m.div variants={itemVariants}>
            <KpiCard
              label="Average balance"
              value={unavailable ? '—' : fmtINR(averageBalance)}
              hint="Per client with dues"
              icon={<TrendingUp size={18} />}
              accent="graphite"
              loading={bs.loading && !bs.data}
            />
          </m.div>
        </m.div>

        {/* ── Period totals ──
            Billed is current-term, paid is lifetime. They are shown side by
            side because both are real; they are not compared, because the
            ratio across different periods is not a collection rate. */}
        <section
          className="mb-6 rounded-[16px] p-4 sm:p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          aria-labelledby="ledger-totals-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="ledger-totals-heading" className="text-[13px] font-[800] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
              Period totals
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Entered values, not derived on this page
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>
                Billed · current PT terms
              </p>
              <p className="mt-1 text-[22px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {fmtINR(totalBilled)}
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Each client&apos;s current fee, set at enrolment or renewal.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>
                Payments recorded · lifetime
              </p>
              <p className="mt-1 text-[22px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {fmtINR(totalPaid)}
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Every payment on record; it does not reset when a client renews.
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            These cover different periods, so they are not subtracted from each
            other and no collection rate is shown. Outstanding is the balance
            stored on each client record and recalculated when a payment is
            recorded. No asset, liability or equity accounts are kept in this
            product.
          </p>
        </section>

        {/* ── Search + Filter bar ── */}
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:min-w-[220px] sm:flex-1">
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            <input aria-label="Search client, trainer, phone"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client, trainer, phone…"
              style={{ width: '100%', minHeight: 44, paddingLeft: 36, paddingRight: search ? 44 : 14, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 0, top: 0, height: 44, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-disabled)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5" role="group" aria-label="Filter by due status">
            {([
              ['ALL', 'All'],
              ['OVERDUE', 'Overdue'],
              ['DUE', 'Due'],
            ] as const).map(([value, label]) => {
              const active = filter === value;
              const cfg = value === 'ALL' ? { color: '#0067e0', bg: 'rgba(0,103,224,0.1)', border: 'rgba(0,103,224,0.25)' } : value === 'OVERDUE' ? { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)' } : { color: '#b45309', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
              return (
                <button key={value} onClick={() => setFilter(value)}
                  aria-pressed={active}
                  style={{ minHeight: 44, fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 10, border: `1.5px solid ${active ? cfg.border : 'var(--border)'}`, background: active ? cfg.bg : 'transparent', color: active ? cfg.color : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {label}
                </button>
              );
            })}
          </div>

          <button
            style={{ display: 'flex', minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', opacity: filtered.length === 0 ? 0.5 : 1 }}
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}>
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* ── Load failure ──
            An empty result and a failed request both produce zero rows; without
            this branch a broken API read as "all clear". */}
        {bs.error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <span className="text-[12.5px] font-[600]" style={{ color: '#b91c1c' }}>
              Couldn&apos;t load the balance sheet. {bs.error.message}
            </span>
            <button type="button" onClick={refresh}
              className="inline-flex h-11 items-center gap-1.5 rounded-[10px] px-4 text-[12px] font-[700]"
              style={{ border: '1px solid rgba(220,38,38,0.3)', background: '#fff', color: '#b91c1c', cursor: 'pointer' }}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* ── Rows ── */}
        {filtered.length > 0 && (
          <>
        {/* Desktop table */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="hidden overflow-hidden sm:block"
          style={{ borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 2px 20px rgba(0,0,0,0.05)', background: 'var(--bg-card)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                  {['Client', 'Package', 'Balance', 'Due', 'Days left'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-disabled)', textAlign: h === 'Balance' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <m.tr key={item.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>
                        {[item.mobile, item.trainer_name].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.package_type || '—'}</span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmtINR(item.balance_amount)}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <DueBadge status={item.due_status} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: item.days_left !== null && item.days_left < 0 ? '#dc2626' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {dayLabel(item.days_left)}
                      </span>
                    </td>
                  </m.tr>
                ))}
              </tbody>
            </table>
          </div>

          <Footer filtered={filtered} total={duesOnly.length} />
        </m.div>

        {/* Mobile cards */}
        <div className="overflow-hidden rounded-[16px] sm:hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {filtered.map(item => (
            <div key={item.id} className="border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                <span className="shrink-0 text-[14px] font-[800] tabular-nums" style={{ color: '#dc2626' }}>{fmtINR(item.balance_amount)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <DueBadge status={item.due_status} />
                <span className="text-[11px]" style={{ color: item.days_left !== null && item.days_left < 0 ? '#dc2626' : 'var(--text-muted)' }}>
                  {dayLabel(item.days_left)}
                </span>
              </div>
              <p className="mt-1 truncate text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
                {[item.package_type, item.mobile, item.trainer_name].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          ))}

          <Footer filtered={filtered} total={duesOnly.length} />
        </div>
          </>
        )}

        {filtered.length === 0 && !bs.loading && !bs.error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px' }}>
            <CheckCircle size={36} style={{ color: '#10b981', marginBottom: 14 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              {search || filter !== 'ALL' ? 'No matching clients' : 'No outstanding balances — all clear!'}
            </p>
            {(search || filter !== 'ALL') && (
              <button type="button" onClick={() => { setSearch(''); setFilter('ALL'); }}
                className="mt-4 h-11 rounded-[10px] px-4 text-[12px] font-[700]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {bs.loading && !bs.data && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #0067e0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </PageContainer>
      </PullToRefresh>
    </Guard>
  );
}

/** Shared footer: the filtered count and the money those rows represent. */
function Footer({ filtered, total }: { filtered: BalanceItem[]; total: number }) {
  if (filtered.length === 0) return null;
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: 'var(--bg-elevated)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> clients
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        Filtered outstanding: <span style={{ color: '#dc2626' }}>{fmtINR(filtered.reduce((s, i) => s + Number(i.balance_amount), 0))}</span>
      </span>
    </div>
  );
}
