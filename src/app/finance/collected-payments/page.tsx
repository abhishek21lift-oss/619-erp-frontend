'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import {
  Banknote, Search, ArrowUpDown, User, Wallet,
  Smartphone, CreditCard, Receipt, CalendarDays, RefreshCw, Inbox,
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
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={18} color="white" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Collected Payments</h1>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              {filtered.length} payment{filtered.length !== 1 ? 's' : ''} · {fmtINR(totalCollected)} total
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={fetchPayments}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => router.push('/finance/record-payment')}
              style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: 'white', boxShadow: '0 2px 8px rgba(14,165,233,0.35)' }}>
              + Record Payment
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              placeholder="Search by client, receipt, notes..."
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, background: 'white', outline: 'none', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
            style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Methods</option>
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>
            {filtered.length > 0 && `Page ${page + 1} of ${pageCount}`}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbff' }}>
                  {['Client', 'Amount', 'Method', 'Receipt', 'Date', 'Notes'].map((h) => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap', cursor: h === 'Amount' || h === 'Date' ? 'pointer' : 'default', userSelect: 'none' }}
                      onClick={h === 'Amount' ? () => toggleSort('amount') : h === 'Date' ? () => toggleSort('date') : undefined}>
                      {h}
                      {(h === 'Amount' || h === 'Date') && (
                        <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline', opacity: sortField === (h === 'Amount' ? 'amount' : 'date') ? 1 : 0.4 }} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} style={{ padding: '14px 20px' }}>
                      <div style={{ height: 13, width: ['40%', '15%', '12%', '18%', '15%'][i % 5], borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                    </td></tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 64, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Inbox size={24} color="#94a3b8" />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No payments found</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{search ? 'Try a different search term.' : 'Record your first payment to get started.'}</div>
                      </div>
                      {!search && (
                        <button onClick={() => router.push('/finance/record-payment')}
                          style={{ marginTop: 8, padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: 'white', boxShadow: '0 2px 8px rgba(14,165,233,0.35)' }}>
                          + Record Payment
                        </button>
                      )}
                    </div>
                  </td></tr>
                ) : (
                  paged.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color="#64748b" />
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{p.client_name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 800, fontSize: 15, color: '#0ea5e9', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                        {fmtINR(p.amount)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: `${METHOD_COLORS[p.method] || '#94a3b8'}15`, color: METHOD_COLORS[p.method] || '#94a3b8' }}>
                          {METHOD_ICONS[p.method] || null}
                          {p.method || 'Other'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {p.receipt_no || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CalendarDays size={13} color="#94a3b8" />
                          {p.date || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-disabled)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: 6, background: '#fafbff' }}>
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : 'white', color: page === 0 ? '#cbd5e1' : 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                Previous
              </button>
              {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => {
                const start = Math.max(0, Math.min(page - 3, pageCount - 7));
                const pIdx = start + i;
                if (pIdx >= pageCount) return null;
                return (
                  <button key={pIdx} onClick={() => setPage(pIdx)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: pIdx === page ? 'none' : '1px solid #e2e8f0', background: pIdx === page ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'white', color: pIdx === page ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {pIdx + 1}
                  </button>
                );
              })}
              <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: page >= pageCount - 1 ? '#f8fafc' : 'white', color: page >= pageCount - 1 ? '#cbd5e1' : 'var(--text-primary)', cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
