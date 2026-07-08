'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import { Button } from '@/components/ui';
import {
  Banknote, Search, ArrowUpDown, User, Wallet,
  Smartphone, CreditCard, Receipt, CalendarDays, RefreshCw, Inbox,
  Layers, IndianRupee, List, TrendingUp,
} from 'lucide-react';

const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');

const METHOD_ICONS: Record<string, React.ReactNode> = {
  UPI: <Smartphone size={14} />,
  Cash: <Wallet size={14} />,
  Card: <CreditCard size={14} />,
  Bank: <Receipt size={14} />,
};

const METHOD_COLORS: Record<string, string> = {
  UPI: '#8b5cf6',
  Cash: '#10b981',
  Card: '#0ea5e9',
  Bank: '#f59e0b',
};

const PAGE_SIZE = 25;

export default function CollectedPaymentsPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

function Inner() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const handleSearch = useCallback((val: string) => {
    searchRef.current = val;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchRef.current);
      setPage(0);
    }, 250);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.payments.list();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.client_name?.toLowerCase() || '').includes(q) ||
          (p.receipt_no?.toLowerCase() || '').includes(q) ||
          (p.notes?.toLowerCase() || '').includes(q),
      );
    }
    if (methodFilter !== 'all') {
      list = list.filter((p) => p.method === methodFilter);
    }
    list.sort((a, b) => {
      let cmp: number;
      if (sortField === 'date') {
        cmp = (a.date || '').localeCompare(b.date || '');
      } else {
        cmp = a.amount - b.amount;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [payments, search, methodFilter, sortField, sortDir]);

  const totalCollected = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);
  const methods = useMemo(() => [...new Set(payments.map((p) => p.method))], [payments]);
  const largestPayment = useMemo(() => filtered.reduce((m, p) => Math.max(m, p.amount), 0), [filtered]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <AppShell>
      <div style={{ minHeight: '100vh' }}>
        {/* Page Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #f3f4f6',
          background: '#fff',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(6,182,212,0.2)',
                }}>
                  <Banknote size={22} color="white" />
                </div>
                <div>
                  <h1 style={{
                    fontSize: 'clamp(20px, 4vw, 28px)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    margin: 0,
                    lineHeight: 1.2,
                    color: '#111827',
                  }}>
                    Collected Payments
                  </h1>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                    Track and manage all incoming payments
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button variant="outline" size="sm" iconLeft={<RefreshCw size={13} />} onClick={fetchPayments}>
                  Refresh
                </Button>
                <Button variant="primary" size="sm" iconLeft={<Banknote size={13} />} onClick={() => router.push('/finance/record-payment')}>
                  + Record Payment
                </Button>
              </div>
            </div>

            {/* KPI Row */}
            {!loading && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                marginTop: 24,
              }}>
                <KPICard icon={<Layers size={18} />} label="Total Payments" value={filtered.length.toString()} accent="#06b6d4" />
                <KPICard icon={<IndianRupee size={18} />} label="Total Collected" value={fmtINR(totalCollected)} accent="#10b981" />
                <KPICard icon={<List size={18} />} label="Unique Methods" value={methods.length.toString()} accent="#8b5cf6" />
                <KPICard icon={<TrendingUp size={18} />} label="Largest Payment" value={fmtINR(largestPayment)} accent="#f59e0b" />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>
          {/* Search & Filters */}
          <div className="mb-5 flex flex-col gap-3">
            <div className="relative w-full">
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                placeholder="Search by client, receipt, notes..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full h-11 rounded-xl outline-none transition-all focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)]"
                style={{ padding: '10px 14px 10px 36px', border: '1.5px solid #e5e7eb', fontSize: 14, background: 'white', color: '#111827' }}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {['all', ...methods].map(m => {
                const isActive = methodFilter === m;
                const color = METHOD_COLORS[m] || '#06b6d4';
                return (
                  <button key={m} onClick={() => { setMethodFilter(m); setPage(0); }}
                    className="shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold whitespace-nowrap transition-all duration-150"
                    style={{
                      background: isActive ? color : '#F3F4F6',
                      color: isActive ? '#fff' : '#6B7280',
                      minHeight: 36,
                    }}>
                    {m === 'all' ? 'All Methods' : m}
                  </button>
                );
              })}
              <span className="ml-auto shrink-0 text-[12px] text-[#9ca3af]">
                {filtered.length > 0 && `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Mobile Cards (shown on small screens) */}
          <div className="md:hidden">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[88px] rounded-[16px] bg-white border border-zinc-100 animate-pulse" />
                ))}
              </div>
            ) : paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                  <Inbox size={24} color="#9ca3af" />
                </div>
                <p className="text-[14px] font-semibold text-[#111827] mb-1">No payments found</p>
                <p className="text-[13px] text-[#6b7280]">{search ? 'Try a different search term.' : 'Record your first payment to get started.'}</p>
                {!search && (
                  <button onClick={() => router.push('/finance/record-payment')}
                    className="mt-4 flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                    <Banknote size={14} /> Record Payment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {paged.map((p) => (
                  <m.div key={p.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-[16px] bg-white border border-zinc-100 p-4 shadow-sm active:scale-[0.985] transition-all"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>
                          <User size={14} color="white" />
                        </div>
                        <span className="font-semibold text-[14px] text-[#111827] truncate">{p.client_name || '—'}</span>
                      </div>
                      <span className="shrink-0 text-[18px] font-[800] tabular-nums ml-2" style={{ color: '#06b6d4', letterSpacing: '-0.02em' }}>{fmtINR(p.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[11px] font-[600]"
                        style={{ background: `${METHOD_COLORS[p.method] || '#9ca3af'}15`, color: METHOD_COLORS[p.method] || '#9ca3af' }}>
                        {METHOD_ICONS[p.method] || null}
                        {p.method || 'Other'}
                      </span>
                      {p.receipt_no && <span className="text-[10px] text-zinc-400 font-mono">{p.receipt_no}</span>}
                      <div className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400">
                        <CalendarDays size={11} color="#9ca3af" />
                        {p.date || '—'}
                      </div>
                    </div>
                    {p.notes && <p className="mt-1.5 text-[11px] text-zinc-400 truncate">{p.notes}</p>}
                  </m.div>
                ))}
              </div>
            )}
            {/* Mobile Pagination */}
            {pageCount > 1 && !loading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="rounded-[10px] px-4 py-2 text-[13px] font-[600] transition-all disabled:opacity-40"
                  style={{ border: '1px solid #e5e7eb', background: 'white', color: '#111827' }}>
                  Previous
                </button>
                <span className="text-[12px] text-[#6b7280]">{page + 1} / {pageCount}</span>
                <button disabled={page >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  className="rounded-[10px] px-4 py-2 text-[13px] font-[600] transition-all disabled:opacity-40"
                  style={{ border: '1px solid #e5e7eb', background: 'white', color: '#111827' }}>
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block" style={{ background: 'white', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #f3f4f6' }}>
                    {['Client', 'Amount', 'Method', 'Receipt', 'Date', 'Notes'].map((h) => (
                      <th key={h} style={{
                        padding: '14px 20px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        whiteSpace: 'nowrap',
                        cursor: h === 'Amount' || h === 'Date' ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                        onClick={h === 'Amount' ? () => toggleSort('amount') : h === 'Date' ? () => toggleSort('date') : undefined}>
                        {h}
                        {(h === 'Amount' || h === 'Date') && (
                          <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline', opacity: sortField === (h === 'Amount' ? 'amount' : 'date') ? 1 : 0.4, color: '#9ca3af' }} />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} style={{ padding: '14px 20px' }}>
                          <m.div
                            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{
                              height: 13,
                              width: ['40%', '15%', '12%', '18%', '15%'][i % 5],
                              borderRadius: 6,
                              background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)',
                              backgroundSize: '200% 100%',
                            }} />
                        </td>
                      </tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 64, textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Inbox size={24} color="#9ca3af" />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Fresh Start</div>
                            <div style={{ fontSize: 13, color: '#6b7280' }}>{search ? 'Try a different search term.' : 'No payments yet. Record your first PT payment to get started.'}</div>
                          </div>
                          {!search && (
                            <Button variant="primary" size="sm" iconLeft={<Banknote size={13} />} onClick={() => router.push('/finance/record-payment')}>
                              + Record Payment
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paged.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 150ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={14} color="white" />
                            </div>
                            <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{p.client_name || '—'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: 15, color: '#06b6d4', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                          {fmtINR(p.amount)}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${METHOD_COLORS[p.method] || '#9ca3af'}15`, color: METHOD_COLORS[p.method] || '#9ca3af' }}>
                            {METHOD_ICONS[p.method] || null}
                            {p.method || 'Other'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>
                          {p.receipt_no || '—'}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <CalendarDays size={13} color="#9ca3af" />
                            {p.date || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: '#9ca3af', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {pageCount > 1 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center', gap: 6, background: '#F9FAFB' }}>
                <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: page === 0 ? '#F9FAFB' : 'white', color: page === 0 ? '#d1d5db' : '#111827', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Previous
                </button>
                {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => {
                  const start = Math.max(0, Math.min(page - 3, pageCount - 7));
                  const pIdx = start + i;
                  if (pIdx >= pageCount) return null;
                  return (
                    <button key={pIdx} onClick={() => setPage(pIdx)}
                      style={{ width: 34, height: 34, borderRadius: 8, border: pIdx === page ? 'none' : '1px solid #e5e7eb', background: pIdx === page ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : 'white', color: pIdx === page ? 'white' : '#111827', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      {pIdx + 1}
                    </button>
                  );
                })}
                <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: page >= pageCount - 1 ? '#F9FAFB' : 'white', color: page >= pageCount - 1 ? '#d1d5db' : '#111827', cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      tabIndex={0} role="button"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.style.transform = 'translateY(-2px)'; }}
      style={{
        background: 'white',
        borderRadius: 20,
        padding: '22px 24px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
      <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${accent},${accent}88)`, borderRadius: '0 0 3px 3px', opacity: 0.8 }} />
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </m.div>
  );
}
