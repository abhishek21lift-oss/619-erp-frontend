'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  TrendingUp, ArrowUpRight, Smartphone, CreditCard,
  Banknote, Wallet, Plus, Receipt, User, Clock,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { PullToRefresh } from '@/components/ui';
import { api, Payment } from '@/lib/api';
import type { PaymentStats } from '@/lib/api/endpoints/money';

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// Ledger stores methods uppercase (CASH/UPI/CARD/NEFT/BANK) — map to the
// display labels this page's icon/colour tables are keyed on.
function displayMethod(raw?: string): string {
  const m = (raw || '').toUpperCase();
  if (m === 'UPI') return 'UPI';
  if (m === 'CASH') return 'Cash';
  if (m === 'CARD') return 'Card';
  if (m === 'NEFT' || m === 'BANK') return 'Bank';
  return raw || 'Other';
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  UPI: <Smartphone size={14} />,
  Cash: <Banknote size={14} />,
  Card: <CreditCard size={14} />,
  Bank: <Wallet size={14} />,
};

const METHOD_COLORS: Record<string, string> = {
  UPI: 'from-violet-500 to-purple-500',
  Cash: 'from-emerald-500 to-green-500',
  Card: 'from-blue-500 to-cyan-500',
  Bank: 'from-amber-500 to-orange-500',
};

export default function TodaysSalePage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<PaymentStats | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Rows for the feed, aggregates from the server. GET /api/payments is
      // capped (LIMIT 200), so on a day that takes more than 200 payments the
      // reduce below would quietly understate the day's takings. Same fix as
      // Collected Payments: /stats does the SUM in SQL, scoped to this date.
      const [list, s] = await Promise.all([
        api.payments.list({ from: today, to: today }),
        api.payments.stats({ from: today, to: today }).catch(() => null),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setStats(s);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const payments = React.useMemo(() => rows.map(p => ({
    id: p.id,
    client_name: p.client_name,
    amount: p.amount,
    method: displayMethod(p.method),
    date: p.date ? String(p.date).slice(0, 10) : '',
  })), [rows]);

  // The server's figure when it is available; the visible rows' sum only as a
  // fallback, which is correct on any day under the 200-row cap and is the
  // best available answer if /stats fails.
  const shownTotal = React.useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const totalToday = stats ? stats.total : shownTotal;
  const methodTotals = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      map[p.method] = (map[p.method] || 0) + p.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="relative z-10 mt-1 space-y-6 max-w-[1600px] mx-auto pb-6">
      {/* Hero revenue card */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-orange-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
      >
        {/* Corner glows as ONE unfiltered gradient layer, replacing two
            `blur-3xl` circles. `filter: blur()` promotes a child to its own
            compositing layer, and WebKit then applies this card's rounded
            `overflow-hidden` clip to that layer as a RECTANGLE — so the blob's
            square corner paints outside the rounded corner. Reported on iOS
            against the client profile card, which had the identical pattern.
            A gradient needs no filter, so nothing is promoted and the clip holds.
            240px, and the averaged colour for each two-tone blob, were fitted
            against the old rendering by pixel comparison: 0.99/255 mean
            difference, where two offset radials per blob scored 2.10. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(circle 240px at calc(100% - 32px) 32px, rgba(247,130,158,0.2), transparent 70%)',
              'radial-gradient(circle 240px at 32px calc(100% - 32px), rgba(251,169,48,0.2), transparent 70%)',
            ].join(', '),
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Total Revenue Today
          </p>
          <p className="mt-2 text-[48px] sm:text-[56px] font-extrabold tracking-[-0.03em] bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent leading-none tabular-nums">
            {loading ? '—' : fmtINR(totalToday)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-400">
              <TrendingUp size={12} />
              Live
            </span>
            <span className="text-[12px] text-[var(--text-muted)]">
              {payments.length} transaction{payments.length !== 1 ? 's' : ''} today
            </span>
          </div>
        </div>
      </m.div>

      {/* Payment method breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {methodTotals.length > 0 ? methodTotals.map(([method, amount], i) => (
          <m.div
            key={method}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${METHOD_COLORS[method] || 'from-slate-500 to-slate-400'} text-white shadow-lg`}>
                {METHOD_ICONS[method] || <Receipt size={14} />}
              </span>
              <div>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">{method}</p>
                <p className="text-[18px] font-extrabold tabular-nums text-[var(--text-primary)]">{fmtINR(amount)}</p>
              </div>
            </div>
          </m.div>
        )) : (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center backdrop-blur-xl"
          >
            <Wallet size={32} className="text-[var(--text-muted)] mb-2" />
            <p className="text-[14px] font-semibold text-[var(--text-muted)]">No payments recorded today</p>
            <button
              type="button"
              onClick={() => router.push('/finance/record-payment')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1.5 text-[12px] font-bold text-white"
            >
              <Plus size={13} />
              Record your first payment
            </button>
          </m.div>
        )}
      </div>

      {/* Today's payments table */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-pink-500/5 via-rose-500/5 to-orange-500/5 p-5 sm:p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-bold bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
              Today's Transactions
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Recent payments recorded today
            </p>
          </div>
        </div>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Client</th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Amount</th>
                  <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Method</th>
                  <th className="py-3 pl-4 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <m.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-500">
                          <User size={14} />
                        </span>
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                          {p.client_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[14px] font-extrabold tabular-nums text-[var(--text-primary)]">
                        {fmtINR(p.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${METHOD_COLORS[p.method || 'Other'] || 'from-slate-500/10 to-slate-400/10'} px-2 py-0.5 text-[11px] font-semibold ${p.method === 'UPI' ? 'text-violet-400' : p.method === 'Cash' ? 'text-emerald-400' : p.method === 'Card' ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`}>
                        {METHOD_ICONS[p.method || 'Other'] || <Receipt size={12} />}
                        {p.method || 'Other'}
                      </span>
                    </td>
                    <td className="py-3 pl-4">
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {p.date || '—'}
                      </span>
                    </td>
                  </m.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt size={36} className="text-[var(--text-muted)] mb-3" />
            <p className="text-[14px] font-semibold text-[var(--text-muted)]">No transactions yet today</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">Payments will appear here once recorded</p>
          </div>
        )}
      </m.div>
    </div>
    </PullToRefresh>
  );
}
